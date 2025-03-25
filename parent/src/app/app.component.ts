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
  childOrigin = 'http://localhost:4300';
  private childIframeLoaded = false;

  ngAfterViewInit() {
    const childIframe = document.getElementById('childFrame') as HTMLIFrameElement;
    
    // Listen for iframe load event
    childIframe.addEventListener('load', () => {
      this.childIframeLoaded = true;
      this.checkExistingUser();
    });

    window.addEventListener('message', this.handleMessage.bind(this));
    this.checkExistingUser();
  }

  handleMessage(event: MessageEvent) {
    // Accept messages from child or same origin
    if (event.origin !== this.childOrigin && event.origin !== window.location.origin) return;
    
    const { action, data } = event.data;

    if (action === 'LOGIN_REQUEST') {
      this.processLogin(data, event.source as Window, event.origin);
    } else if (action === 'GET_USER_REQUEST') {
      this.sendUserData(event.source as Window, event.origin);
    } else if (action === 'CHILD_READY') {
      this.sendCurrentUserToChild();
    }
  }

  private sendCurrentUserToChild() {
    const userData = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (userData) {
      this.notifyChild(userData);
    }
  }

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

    // Notify both the source and the child iframe
    if (sourceWindow !== window) {
      sourceWindow.postMessage({
        action: 'LOGIN_RESPONSE',
        data: userData
      }, origin);
    }
    
    this.notifyChild(userData);
  }

  notifyChild(userData: any) {
    if (!this.childIframeLoaded) return;

    const childIframe = document.getElementById('childFrame') as HTMLIFrameElement;
    childIframe?.contentWindow?.postMessage({
      action: 'LOGIN_RESPONSE',
      data: userData
    }, this.childOrigin);
  }

  sendUserData(targetWindow: Window, origin: string) {
    const userData = JSON.parse(localStorage.getItem('currentUser') || 'null');
    targetWindow.postMessage({
      action: 'GET_USER_RESPONSE',
      data: userData
    }, origin);
  }

  // checkExistingUser() {
  //   const userData = JSON.parse(localStorage.getItem('currentUser') || 'null');
  //   if (userData?.username) {
  //     this.loggedInUser = userData.username;
  //     this.notifyChild(userData);
  //   }
  // }

  checkExistingUser() {
    const userData = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (userData?.username) {
      this.loggedInUser = userData.username;
      // Notify any existing child frames
      this.notifyChild(userData);
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

    // Process login directly and notify child
    this.processLogin(userData, window, window.location.origin);
  }
}