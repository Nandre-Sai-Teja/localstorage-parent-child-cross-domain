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
  title = 'child2';

  username: string = ""
  email: string = ""
  password: string = ""
  loggedInUser: string | null  = null
  parentOrigin = "http://localhost:4200"

  ngAfterViewInit(){
    window.addEventListener("message", this.handleMessage.bind(this));
    this.requestUserData();
  }

  handleMessage(event: MessageEvent){
    //check if the origin is correct (parent or not)
    if(event.origin !== this.parentOrigin) return;

    const {action, data} = event.data

    if(action === 'LOGIN_RESPONSE'){
      this.loggedInUser = data.username
    } else if (action === 'GET_USER_RESPONSE'){
      this.loggedInUser = data?.username || null;
    }
  }

  requestUserData(){
    this.getParentIframe()?.contentWindow?.postMessage({
      action: 'GET_USER_REQUEST'
    }, this.parentOrigin)
  }

  getParentIframe(): HTMLIFrameElement | null{
    return document.getElementById('parentFrame') as HTMLIFrameElement
  }

  login(){
    const userDate = {
      username: this.username,
      email: this.email,
      password: this.password
    };

    this.getParentIframe()?.contentWindow?.postMessage({
      action : 'LOGIN_REQUEST',
      data: userDate
    }, this.parentOrigin)
  }
}
