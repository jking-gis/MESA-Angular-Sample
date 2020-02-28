import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http"; 

import { AppComponent } from "./app.component";
import { EsriMapComponent } from "./esri-map/esri-map.component";

@NgModule({
  declarations: [AppComponent, EsriMapComponent],
  imports: [BrowserModule, HttpClientModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
