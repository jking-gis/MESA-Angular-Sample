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
import { CloneVisitor } from '@angular/compiler/src/i18n/i18n_ast';
import { AppConfig } from './../app.config';

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
  @ViewChild('warningMessageNode', { static: true }) private warningMessageEl: ElementRef;
  @ViewChild('inputProjectIdNode', { static: true }) private inputProjectIdEl: ElementRef;

  // html text
  public buttonText = 'Submit Drawn Feature(s)';
  public warningMessageText = 'Zoom in further to start drawing';
  public projectIdPlaceholder = 'Please enter project ID';

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
  private _geoprocessor: esri.Geoprocessor = null;

  private _editService: string = AppConfig.settings.services.edit;
  private _editLayer: esri.FeatureLayer = null;

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
    const inputProjectId = this.inputProjectIdEl.nativeElement.value;
    this._sketch.layer.graphics.forEach(graphic => {
      graphic.attributes = {
        projectId: inputProjectId
      };
      jsonFeatures.push(graphic.toJSON());
    });
    if (jsonFeatures.length > 0) {
      const jsonResultText = JSON.stringify(jsonFeatures);
      const params = {
        addFeaturesParams: jsonResultText,
        serviceUrl: this._editService
      };
      this._geoprocessor.submitJob(params).then((jobInfo) => {
        const jobid = jobInfo.jobId;
        const options = {
          interval: 1500,
          statusCallback: (j) => {
            console.log('Job Status: ', j.jobStatus);
          }
        };
      });
    }
  }

  inputProjectIdChanged() {
    this.submitButtonEl.nativeElement.disabled = !(
      this.inputProjectIdEl.nativeElement.value &&
      this.inputProjectIdEl.nativeElement !== ''
    );
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

  // async initializeEditor() {
  //   const [EsriEditor] = await loadModules([
  //     'esri/widgets/Editor'
  //   ]);

  //   const editor: esri.Editor = new EsriEditor({
  //     view: this._view
  //   });

  //   this._view.ui.add(editor, 'top-right');
  // }

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

    this._sketch.on('create', (event) => {
      if (event.state === 'complete') {
        event.graphic.symbol.color = [250, 250, 0, 0.5];
        event.graphic.symbol.outline = {
          color: [50, 50, 0, 1],
          width: '3px'
        };
      }
    });

    this._view.ui.add(sketch, 'top-right');
    this._view.ui.add(this.warningMessageEl.nativeElement, 'top-right');
    this.warningMessageEl.nativeElement.classList.remove('hidden');
    this._view.ui.add(this.inputProjectIdEl.nativeElement, 'top-right');
    this.inputProjectIdEl.nativeElement.classList.remove('hidden');
    this._view.ui.add(this.submitButtonEl.nativeElement, 'top-right');
    this.submitButtonEl.nativeElement.classList.remove('hidden');

    this._scaleChanged(0, 100000);

    return sketch;
  }

  async initializeGP() {
    try {
      // Load the modules for the ArcGIS API for JavaScript
      const [EsriGeoprocessor] = await loadModules([
        'esri/tasks/Geoprocessor'
      ]);

      this._geoprocessor = new EsriGeoprocessor({
        url: 'gp-url'
      });
    } catch (error) {
      console.log('EsriLoader: ', error);
    }
  }

  async initializeMap() {
    try {
      // Load the modules for the ArcGIS API for JavaScript
      const [EsriMap, EsriMapView, EsriWatchUtils, EsriFeatureLayer] = await loadModules([
        'esri/Map',
        'esri/views/MapView',
        'esri/core/watchUtils',
        'esri/layers/FeatureLayer'
      ]);

      // Configure the Map
      const mapProperties: esri.MapProperties = {
        basemap: this._basemap
      };

      const map: esri.Map = new EsriMap(mapProperties);
      // this._editLayer = new EsriFeatureLayer({
      //   url: this._editService
      // });
      // map.add(this._editLayer)

      // Initialize the MapView
      const mapViewProperties: esri.MapViewProperties = {
        container: this.mapViewEl.nativeElement,
        center: this._center,
        zoom: this._zoom,
        map
      };

      this._view = new EsriMapView(mapViewProperties);

      await this._view.when();

      this._view.watch('scale', (oldVal, newVal) => {
        this._scaleChanged(oldVal, newVal);
      });

      return this._view;
    } catch (error) {
      console.log('EsriLoader: ', error);
    }
  }

  _scaleChanged(oldVal, newVal) {
    const polygonButton = document.querySelector('.esri-sketch__button.esri-icon-polygon');
    if (polygonButton) {
      if (newVal > 10000) {
        polygonButton.setAttribute('disabled', '');
        this.warningMessageEl.nativeElement.classList.remove('hidden');
        this._sketch.cancel();
      } else {
        polygonButton.removeAttribute('disabled');
        this.warningMessageEl.nativeElement.classList.add('hidden');
      }
    } else {
      setTimeout(() => { this._scaleChanged(oldVal, newVal); }, 1000);
    }
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
      this.initializeGP();
    });
  }

  ngOnDestroy() {
    if (this._view) {
      // destroy the map view
      this._view.container = null;
    }
  }
}
