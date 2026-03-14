import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { App } from './app';
import { ReceptiComponent } from './recepti/recepti.component';

@NgModule({
  declarations: [
    App
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ReceptiComponent
  ],
  bootstrap: [App]
})
export class AppModule { }
