import { loadModules } from 'esri-loader';
import esri = __esri; // Esri TypeScript Types
import { Component, OnInit, ElementRef, ViewChild, TemplateRef } from '@angular/core';
import { request } from 'http';
import { AppConfig } from '../app.config';
import { geographicToWebMercator } from 'esri/geometry/support/webMercatorUtils';

@Component({
  selector: 'app-geom-create',
  templateUrl: './geom-create.component.html',
  styleUrls: ['./geom-create.component.scss']
})
export class GeomCreateComponent implements OnInit {
  @ViewChild('geomCreate', { static: true }) private tpl: ElementRef;
  @ViewChild('inputSketchNode', { static: true }) private inputSketchEl: ElementRef;
  @ViewChild('inputFileNode', { static: true }) private inputFileEl: ElementRef;

  private _sketch: esri.Sketch = null;
  private _sketchLayer: esri.GraphicsLayer = null;
  private _view: esri.MapView = null;

  private _portalUrl: string = AppConfig.settings.portal.url;

  constructor() {
  }

  ngOnInit() {
  }

  async inputFileChanged() {
    const [EsriRequest, EsriGraphic, EsriPolygon] = await loadModules([
      'esri/request',
      'esri/Graphic',
      'esri/geometry/Polygon'
    ]);

    const formData: FormData = new FormData();
    const file = this.inputFileEl.nativeElement.files[0];
    if (file.type === 'application/json') { // json
      const reader: FileReader = new FileReader();
      reader.addEventListener('load', (event: any) => {
        // console.log(event.target.result as string);
        const obj = JSON.parse(event.target.result);
        const sr = obj.spatialReference;
        const graphics = [];
        obj.features.forEach(feature => {
          const poly = new EsriPolygon(feature.geometry);
          poly.spatialReference = sr;
          graphics.push(new EsriGraphic({
            geometry: poly,
            attributes: feature.attributes
          }));
        });
        this._sketch.layer.addMany(graphics);
      });
      reader.readAsText(file);
    } else if (file.type === 'application/x-zip-compressed') { // zip (shapefile)
      formData.append('file', file, file.name);

      const params = {
        name: 'test',
        targetSR: this._view.spatialReference,
        maxRecordCount: 1000,
        enforceInputFileSizeLimit: true,
        enforceOutputJsonSizeLimit: true,
        generalize: true,
        maxAllowableOffset: 10,
        reducePrecision: true,
        numberOfDigitsAfterDecimal: 0
      };

      const myContent = {
        filetype: 'shapefile',
        publishParameters: JSON.stringify(params),
        f: 'json'
      };

      EsriRequest(this._portalUrl + '/sharing/rest/content/features/generate', {
        query: myContent,
        body: formData,
        responseType: 'json'
      }).then((response) => {
        if (response.data) {
          response.data.featureCollection.layers.forEach(layer => {
            const graphics = [];
            layer.featureSet.features.forEach(feature => {
              graphics.push(new EsriGraphic({
                geometry: new EsriPolygon(feature.geometry),
                attributes: feature.attributes
              }));
            });
            this._sketch.layer.addMany(graphics);
          });
        }
      }).catch((error) => {
        console.log(error);
      });
    }
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
      availableCreateTools: ['polygon'],
      container: this.inputSketchEl.nativeElement
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

    return sketch;
  }

  setView(view) {
    this._view = view;
  }

  getSketch() {
    return this._sketch;
  }

  getDom() {
    return this.tpl.nativeElement;
  }
}
