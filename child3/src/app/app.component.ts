import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule, ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit, OnInit {
  title = 'child3';
  username: string = '';
  email: string = '';
  password: string = '';
  loggedInUser: string | null = null;
  parentOrigin = 'http://localhost:4200';
  private parentIframe: HTMLIFrameElement | null = null;
  private retryCount = 0;
  private readonly maxRetries = 5; //doenst matter even if it is set to 0

  ngOnInit() { //runs after the component creation
    // Initialize early to handle fast responses
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  ngAfterViewInit() { //runs after the view has been initialized
    this.parentIframe = document.getElementById('parentFrame') as HTMLIFrameElement; //typecasted into HTMLIFrameElement to ensure it is treated as an iframe
    // Add load event listener to parent iframe
    this.parentIframe?.addEventListener('load', () => {
      this.requestUserData();
    });
    // Initial request with retry mechanism
    this.requestUserDataWithRetry(); //request user data multiple times if needed
  }

  requestUserData() {
        this.getParentIframe()?.contentWindow?.postMessage({
          action: 'GET_USER_REQUEST'
        }, this.parentOrigin);
      }
      //private so that only in this it can be called, outsode components will not be able to access this
  private requestUserDataWithRetry() { //handle when parent page(iframe) is not loaded that fast, if we dont use this then requestUserData is called only once which may not work when the parent page (iframe) is not loaded
    if (this.retryCount >= this.maxRetries) return;
    if (!this.parentIframe?.contentWindow) {
      setTimeout(() => {
        this.retryCount++;
        this.requestUserDataWithRetry();
      }, 300);
      return;
    }
    //if the iframe is not available, it waits 300ms and tries again
    //sends another request after 1 second if no data is found
    this.getParentIframe()?.contentWindow?.postMessage({
      action: 'GET_USER_REQUEST'
    }, this.parentOrigin);
    // Fallback check after 1 second
    setTimeout(() => {
      if (!this.loggedInUser) {
        this.getParentIframe()?.contentWindow?.postMessage({
          action: 'GET_USER_REQUEST'
        }, this.parentOrigin);
      }
    }, 1000);
  }

  handleMessage(event: MessageEvent) {
    if (event.origin !== this.parentOrigin) return;
    const { action, data } = event.data;
    if (action === 'LOGIN_RESPONSE' || action === 'GET_USER_RESPONSE') {
      this.loggedInUser = data?.username || null;
    }
  }

  login() {
    const userData = {
      username: this.username,
      email: this.email,
      password: this.password
    };
    this.getParentIframe()?.contentWindow?.postMessage({
      action: 'LOGIN_REQUEST',
      data: userData
    }, this.parentOrigin);
  }

  getParentIframe(): HTMLIFrameElement | null {
    return this.parentIframe;
  }
}