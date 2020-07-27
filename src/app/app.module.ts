import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { APP_INITIALIZER } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { EsriMapComponent } from './esri-map/esri-map.component';

import { AppConfig } from './app.config';
import { GeomCreateComponent } from './geom-create/geom-create.component';

export function initializeApp(appConfig: AppConfig) {
  return () => appConfig.load();
}
@NgModule({
  declarations: [AppComponent, EsriMapComponent, GeomCreateComponent],
  imports: [BrowserModule, HttpClientModule],
  providers: [
    AppConfig,
    { provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AppConfig], multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
