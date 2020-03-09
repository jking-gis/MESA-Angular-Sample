/*
  Copyright 2019 Esri
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnDestroy
} from '@angular/core';
import { loadModules } from 'esri-loader';
import esri = __esri; // Esri TypeScript Types
import { Button } from 'protractor';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-esri-map',
  templateUrl: './esri-map.component.html',
  styleUrls: ['./esri-map.component.scss']
})
export class EsriMapComponent implements OnInit, OnDestroy {
  @Output() mapLoadedEvent = new EventEmitter<boolean>();

  // The <div> where we will place the map
  @ViewChild('mapViewNode', { static: true }) private mapViewEl: ElementRef;
  @ViewChild('submitButtonNode', { static: true }) private submitButtonEl: ElementRef;
  @ViewChild('jsonResultNode', { static: true }) private jsonResultEl: ElementRef;

  // html text
  public buttonText = 'Submit Selected Feature(s)';
  public jsonResultText = 'No result yet';

  /**
   * _zoom sets map zoom
   * _center sets map center
   * _basemap sets type of map
   * _loaded provides map loaded status
   */
  private _zoom = 10;
  private _center: Array<number> = [0.1278, 51.5074];
  private _basemap = 'streets';
  private _loaded = false;
  private _view: esri.MapView = null;
  private _sketch: esri.Sketch = null;
  private _search: esri.widgetsSearch = null;

  get mapLoaded(): boolean {
    return this._loaded;
  }

  @Input()
  set zoom(zoom: number) {
    this._zoom = zoom;
  }

  get zoom(): number {
    return this._zoom;
  }

  @Input()
  set center(center: Array<number>) {
    this._center = center;
  }

  get center(): Array<number> {
    return this._center;
  }

  @Input()
  set basemap(basemap: string) {
    this._basemap = basemap;
  }

  get basemap(): string {
    return this._basemap;
  }

  constructor(private http: HttpClient) {}

  submitButtonClicked() {
    const jsonFeatures = [];
    this._sketch.updateGraphics.forEach(graphic => {
      jsonFeatures.push(graphic.toJSON());
    });
    if (jsonFeatures.length > 0) {
      this.jsonResultText = JSON.stringify(jsonFeatures);
      const url = 'https://services1.arcgis.com/g2TonOxuRkIqSOFx/arcgis/rest/services/Geodev_101_Polygon/FeatureServer/0/addFeatures';
      this.http.post<any>(url, { f: 'json', features: this.jsonResultText }, {
        headers: {
          'Content-Type' : 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Method': 'POST'
        }
      }).subscribe(data => {
        console.log(data);
      });
    }
  }

  async initializeSearch() {
    const [EsriSearch] = await loadModules([
      'esri/widgets/Search'
    ]);

    const search: esri.widgetsSearch = new EsriSearch({
      view: this._view
    });
    this._search = search;

    this._view.ui.add(search, 'top-left');
    this._view.ui.move('zoom', 'top-left');
  }

  async initializeSketch() {
    const [EsriSketch, EsriGraphicsLayer] = await loadModules([
      'esri/widgets/Sketch',
      'esri/layers/GraphicsLayer'
    ]);

    const layer: esri.GraphicsLayer = new EsriGraphicsLayer();
    this._view.map.add(layer);

    const sketch: esri.Sketch = new EsriSketch({
      layer,
      view: this._view,
      creationMode: 'update',
      availableCreateTools: ['polygon']
    });
    this._sketch = sketch;

    this._view.ui.add(sketch, 'top-right');
    this._view.ui.add(this.submitButtonEl.nativeElement, 'top-right');
    this._view.ui.add(this.jsonResultEl.nativeElement, 'top-right');
    return sketch;
  }

  async initializeMap() {
    try {
      // Load the modules for the ArcGIS API for JavaScript
      const [EsriMap, EsriMapView, EsriWatchUtils] = await loadModules([
        'esri/Map',
        'esri/views/MapView',
        'esri/core/watchUtils'
      ]);

      // Configure the Map
      const mapProperties: esri.MapProperties = {
        basemap: this._basemap
      };

      const map: esri.Map = new EsriMap(mapProperties);

      // Initialize the MapView
      const mapViewProperties: esri.MapViewProperties = {
        container: this.mapViewEl.nativeElement,
        center: this._center,
        zoom: this._zoom,
        map
      };

      this._view = new EsriMapView(mapViewProperties);

      await this._view.when();

      this._view.watch('scale', this._scaleChanged);

      return this._view;
    } catch (error) {
      console.log('EsriLoader: ', error);
    }
  }

  _scaleChanged(newVal, oldVal, propName, target) {
    console.log(evt);
  }

  ngOnInit() {
    // Initialize MapView and return an instance of MapView
    this.initializeMap().then(mapView => {
      // The map has been initialized
      console.log('mapView ready: ', this._view.ready);
      this._loaded = this._view.ready;
      this.mapLoadedEvent.emit(true);

      this.initializeSketch();
      this.initializeSearch();
    });
  }

  ngOnDestroy() {
    if (this._view) {
      // destroy the map view
      this._view.container = null;
    }
  }
}
