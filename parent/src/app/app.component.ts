import { AfterViewInit, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit {
  title = 'parent';
  username: string = '';
  email: string = '';
  password: string = '';
  loggedInUser: string | null = null;

  childOrigins = ['http://localhost:4300', 'http://localhost:4400', 'http://localhost:4500']; // Multiple children
  private childIframesLoaded: Record<string, boolean> = {
    'http://localhost:4300': false,
    'http://localhost:4400': false,
    'http://localhost:4500': false
  };

  ngAfterViewInit() {
    this.childOrigins.forEach((origin, index) => {
      const childIframe = document.getElementById(`childFrame${index + 1}`) as HTMLIFrameElement;
      // Listen for iframe load event
      childIframe.addEventListener('load', () => {
        this.childIframesLoaded[origin] = true;
        this.sendCurrentUserToChild(origin);
      });
    });
    window.addEventListener('message', this.handleMessage.bind(this));
    this.checkExistingUser(); // To check if a user is already logged in
  }

  handleMessage(event: MessageEvent) {
    // Accept messages only from registered child origins or the same parent origin
    if (!this.childOrigins.includes(event.origin) && event.origin !== window.location.origin) return;
    const { action, data } = event.data;
    if (action === 'LOGIN_REQUEST') {
      this.processLogin(data, event.source as Window, event.origin);
    } else if (action === 'GET_USER_REQUEST') {
      this.sendUserData(event.source as Window, event.origin);
    } else if (action === 'CHILD_READY') {
      this.sendCurrentUserToChild(event.origin);
    }
  }

  private sendCurrentUserToChild(childOrigin: string) {
    const userData = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (userData) {
      this.notifyChild(userData, childOrigin);
    }
  }

  // Handles login and synchronizes across all children
  processLogin(userData: any, sourceWindow: Window, origin: string) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const existingUser = users.find((u: any) =>
      u.username === userData.username && u.email === userData.email
    );
    if (!existingUser) {
      users.push(userData);
      localStorage.setItem('users', JSON.stringify(users));
    }
    localStorage.setItem('currentUser', JSON.stringify(userData));
    this.loggedInUser = userData.username;
    // Notify the source window (if it's not the parent)
    if (sourceWindow !== window) {
      sourceWindow.postMessage({
        action: 'LOGIN_RESPONSE',
        data: userData
      }, origin);
    }
    // Notify all child iframes
    this.childOrigins.forEach(childOrigin => {
      this.notifyChild(userData, childOrigin);
    });
  }

  notifyChild(userData: any, childOrigin: string) {
    if (!this.childIframesLoaded[childOrigin]) return;
    const childIframe = this.getChildIframe(childOrigin);
    childIframe?.contentWindow?.postMessage({
      action: 'LOGIN_RESPONSE',
      data: userData
    }, childOrigin);
  }

  sendUserData(targetWindow: Window, origin: string) {
    const userData = JSON.parse(localStorage.getItem('currentUser') || 'null');
    targetWindow.postMessage({
      action: 'GET_USER_RESPONSE',
      data: userData
    }, origin);
  }

  checkExistingUser() {
    const userData = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (userData?.username) {
      this.loggedInUser = userData.username;
      // Notify all child frames
      this.childOrigins.forEach(childOrigin => {
        this.notifyChild(userData, childOrigin);
      });
      // Also send to the parent window (for the child's main page)
      window.postMessage({
        action: 'GET_USER_RESPONSE',
        data: userData
      }, window.location.origin);
    }
  }

  login() {
    const userData = {
      username: this.username,
      email: this.email,
      password: this.password
    };
    // Process login directly and notify children
    this.processLogin(userData, window, window.location.origin);
  }

  private getChildIframe(childOrigin: string): HTMLIFrameElement | null {
    const index = this.childOrigins.indexOf(childOrigin); // Find the index of childOrigin
    if (index === -1) return null; // If childOrigin is not found, return null
    return document.getElementById(`childFrame${index + 1}`) as HTMLIFrameElement;
  }

}
