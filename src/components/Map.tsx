import type { FeatureCollection, Geometry as GeoJSONGeometry } from 'geojson'
import type { Feature } from 'ol'
import type { Geometry } from 'ol/geom'
import { SearchOutlined } from '@ant-design/icons'
import { Input, message } from 'antd'
import GeoJSON from 'ol/format/GeoJSON'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import Map from 'ol/Map'
import Overlay from 'ol/Overlay'
import { fromLonLat } from 'ol/proj'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import { Circle, Fill, Stroke, Style } from 'ol/style'
import View from 'ol/View'
import { useEffect, useRef, useState } from 'react'
import 'ol/ol.css'
import 'antd/dist/reset.css'

interface District {
  adcode: string
  name: string
  center: number[]
  centroid: number[]
  childrenNum: number
  level: string
  parent: {
    adcode: string
  }
  subFeatureIndex: number
  acroutes: number[]
  adchar?: any
}

export default function MapComponent() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<Overlay | null>(null)
  const [districts, setDistricts] = useState<FeatureCollection<GeoJSONGeometry | null, District> | null>(null)
  const [districtLayer, setDistrictLayer] = useState<VectorLayer<VectorSource<Feature<Geometry>>> | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const highlightedFeature = useRef<Feature<Geometry> | null>(null)
  const highlightLayer = useRef<VectorLayer<VectorSource<Feature<Geometry>>> | null>(null)

  // 加载行政区数据
  useEffect(() => {
    const loadDistricts = async () => {
      try {
        const response = await fetch('/geojson/district/china.json')
        const data = await response.json()
        setDistricts(data)
      }
      catch (error) {
        console.error('加载行政区数据失败:', error)
        message.error('加载行政区数据失败')
      }
    }
    loadDistricts()
  }, [])

  const searchDistrict = async (name: string) => {
    if (!name || !districts)
      return

    const findDistrictInTree = async (districtTree: FeatureCollection<GeoJSONGeometry | null, District>, searchName: string): Promise<{ code: string, type: string } | null> => {
      if (!districtTree.features)
        return null

      for (const feature of districtTree.features) {
        if (!feature.properties)
          continue

        if (feature.properties.name.includes(searchName)) {
          return {
            code: feature.properties.adcode,
            type: 'province',
          }
        }
      }
      return null
    }

    const result = await findDistrictInTree(districts, name)
    if (!result) {
      message.error('未找到该行政区')
      return
    }

    try {
      const response = await fetch(`/geojson/district/${result.type}/${result.code}.json`)
      const geojsonData = await response.json()

      // 移除旧图层
      if (districtLayer && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(districtLayer)
      }

      // 创建新图层
      const newLayer = new VectorLayer({
        source: new VectorSource({
          features: new GeoJSON().readFeatures(geojsonData, {
            featureProjection: 'EPSG:3857',
          }),
        }),
        style: new Style({
          fill: new Fill({
            color: 'rgba(255, 166, 0, 0.2)',
          }),
          stroke: new Stroke({
            color: '#ffa600',
            width: 2,
          }),
        }),
        zIndex: 1,
      })

      // 添加新图层
      if (mapInstanceRef.current) {
        mapInstanceRef.current.addLayer(newLayer)
        setDistrictLayer(newLayer)

        // 缩放到行政区范围
        const extent = newLayer.getSource()?.getExtent()
        if (extent) {
          mapInstanceRef.current.getView().fit(extent, {
            padding: [50, 50, 50, 50],
            duration: 1000,
          })
        }
      }
    }
    catch (error) {
      console.error('加载行政区边界失败:', error)
      message.error('加载行政区边界失败')
    }
  }

  useEffect(() => {
    if (!mapRef.current || !popupRef.current)
      return

    // 创建悬浮提示 Overlay
    const overlay = new Overlay({
      element: popupRef.current,
      positioning: 'bottom-center',
      offset: [0, -5],
      stopEvent: false,
    })
    overlayRef.current = overlay

    // 水系样式
    const waterStyle = new Style({
      fill: new Fill({
        color: 'rgba(0, 119, 190, 0.3)',
      }),
      stroke: new Stroke({
        color: '#0077be',
        width: 2,
      }),
    })

    // 山脉样式
    const mountainStyle = new Style({
      image: new Circle({
        radius: 6,
        fill: new Fill({
          color: 'rgba(139, 69, 19, 0.6)',
        }),
        stroke: new Stroke({
          color: '#8b4513',
          width: 2,
        }),
      }),
    })

    // 创建地图实例
    const map = new Map({
      target: mapRef.current,
      layers: [
        // 天地图底图
        new TileLayer({
          source: new XYZ({
            url: 'https://t{0-7}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=3d041edece62d96b6ab8bdc160fcf588',
            maxZoom: 18,
          }),
        }),
        // 天地图标注
        new TileLayer({
          source: new XYZ({
            url: 'https://t{0-7}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=3d041edece62d96b6ab8bdc160fcf588',
            maxZoom: 18,
          }),
        }),
        // 中国边界图层
        new VectorLayer({
          source: new VectorSource({
            url: '/geojson/border.geojson',
            format: new GeoJSON(),
          }),
          style: new Style({
            stroke: new Stroke({
              color: '#ff4d4f',
              width: 3,
            }),
          }),
          zIndex: 99,
        }),
        // 水系图层
        new VectorLayer({
          source: new VectorSource({
            url: '/geojson/water/hyd1_4l.geojson', // 一级水系线数据
            format: new GeoJSON(),
          }),
          style: waterStyle,
          zIndex: 100,
        }),
        new VectorLayer({
          source: new VectorSource({
            url: '/geojson/water/waters.geojson', // 水系数据
            format: new GeoJSON(),
          }),
          style: waterStyle,
          zIndex: 100,
        }),
        // // 山脉图层
        // new VectorLayer({
        //   source: new VectorSource({
        //     url: '/geojson/mountain/mountains.geojson', // 山脉数据
        //     format: new GeoJSON(),
        //   }),
        //   style: mountainStyle,
        //   zIndex: 100,
        // }),
      ],
      view: new View({
        center: fromLonLat([104.195397, 35.86166]),
        zoom: 5,
        maxZoom: 18,
        minZoom: 3,
      }),
    })

    map.addOverlay(overlay)

    // 在地图初始化 useEffect 中创建高亮图层
    const highlight = new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.4)',
        }),
        stroke: new Stroke({
          color: '#ff0000',
          width: 2,
        }),
      }),
      zIndex: 999,
    })
    map.addLayer(highlight)
    highlightLayer.current = highlight

    // 鼠标移动事件处理
    map.on('pointermove', (evt) => {
      if (evt.dragging)
        return

      const pixel = map.getEventPixel(evt.originalEvent)
      const hit = map.hasFeatureAtPixel(pixel)

      map.getTargetElement().style.cursor = hit ? 'pointer' : ''

      // 更新高亮
      if (hit) {
        const features = map.getFeaturesAtPixel(pixel)
        if (features && features.length > 0) {
          const feature = features[0] as Feature<Geometry>

          // 如果是新的要素，更新高亮
          if (highlightedFeature.current !== feature) {
            highlightLayer.current?.getSource()?.clear()
            highlightLayer.current?.getSource()?.addFeature(feature.clone())
            highlightedFeature.current = feature
          }

          // 显示名称提示
          const properties = feature.getProperties()
          const name = properties.name || properties.NAME || properties.Name || '未知'
          overlayRef.current?.setPosition(evt.coordinate)
          if (popupRef.current) {
            popupRef.current.innerHTML = name
            popupRef.current.style.display = 'block'
            popupRef.current.style.width = '100px'
          }
        }
      }
      else {
        // 清除高亮
        highlightLayer.current?.getSource()?.clear()
        highlightedFeature.current = null
        if (popupRef.current) {
          popupRef.current.style.display = 'none'
        }
      }
    })

    // 点击事件处理
    map.on('click', (evt) => {
      const features = map.getFeaturesAtPixel(evt.pixel)
      if (features && features.length > 0) {
        const feature = features[0] as Feature<Geometry>
        const properties = feature.getProperties()
        const name = properties.name || properties.NAME || properties.Name || ''

        if (name) {
          // 使用维基百科搜索 API 获取对应条目
          const wikiUrl = `https://zh.wikipedia.org/wiki/${encodeURIComponent(name)}`
          window.open(wikiUrl, '_blank')
        }
      }
    })

    mapInstanceRef.current = map

    return () => {
      map.setTarget(undefined)
      mapInstanceRef.current = null
    }
  }, [])

  return (
    <div className="relative w-full h-full">
      <div className="absolute z-10 w-64 top-4 left-4">
        <Input.Search
          placeholder="请输入行政区名称"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          onSearch={searchDistrict}
          enterButton={<SearchOutlined />}
        />
      </div>
      <div ref={mapRef} className="w-full h-full" />
      <div
        ref={popupRef}
        className="absolute hidden px-2 py-1 text-sm bg-white rounded shadow-md pointer-events-none"
        style={{ zIndex: 1000 }}
      />
    </div>
  )
}
