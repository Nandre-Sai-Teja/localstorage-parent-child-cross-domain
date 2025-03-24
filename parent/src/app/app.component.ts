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
export class AppComponent implements AfterViewInit{
  title = 'parent';
  username: string = '';
  email: string = '';
  password: string = '';
  loggedInUser: string | null = null;
  childOrigin = 'http://localhost:4300';

  ngAfterViewInit() {
    //listens for post message events from the child page
    window.addEventListener('message', this.handleMessage.bind(this)); //bind ensures that it has the correct this context
    this.checkExistingUser();
  }

  handleMessage(event: MessageEvent) {
    if (event.origin !== this.childOrigin) return;
    //extracts action and data from the received message
    const { action, data } = event.data;

    if (action === 'LOGIN_REQUEST') {
      this.processLogin(data, event.source as Window, event.origin);
    } else if (action === 'GET_USER_REQUEST') {
      this.sendUserData(event.source as Window, event.origin);
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

    this.notifyChild(userData);
    sourceWindow.postMessage({
      action: 'LOGIN_RESPONSE',
      data: userData
    }, origin);
  }

  notifyChild(userData: any) {
    const childIframe = document.getElementById('childFrame') as HTMLIFrameElement;
    if (childIframe && childIframe.contentWindow) {
      childIframe.contentWindow.postMessage({
        action: 'LOGIN_RESPONSE',
        data: userData
      }, this.childOrigin);
    }
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
    }
  }

  login() {
    const userData = {
      username: this.username,
      email: this.email,
      password: this.password
    };

    this.processLogin(userData, window, window.location.origin);
  }
}
