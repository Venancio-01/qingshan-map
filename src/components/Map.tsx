import * as echarts from 'echarts'
import ReactECharts from 'echarts-for-react'
import { useEffect, useRef, useState } from 'react'

function Map() {
  const [mapOption, setMapOption] = useState<echarts.EChartOption>({})
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const chartRef = useRef<ReactECharts>(null)

  useEffect(() => {
    // 并行加载中国地图数据和水系数据
    Promise.all([
      fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json').then(res => res.json()),
      fetch('/geojson/water/waters.geojson').then(res => res.json()),
    ]).then(([chinaMap, waterBodies]) => {
      echarts.registerMap('China', chinaMap)

      // 转换水系数据为 ECharts 格式
      const waterBodyCoords = waterBodies.features.map((feature: any) => {
        return {
          name: feature.properties.NAME,
          value: feature.geometry.coordinates,
          coordinates: feature.geometry.coordinates,
          type: feature.geometry.type,
        }
      })

      setMapOption({
        geo: {
          map: 'China',
          roam: true,
          label: {
            show: true,
            color: '#333',
            fontSize: 8,
          },
          itemStyle: {
            areaColor: '#f3f4f6',
            borderColor: '#ccc',
          },
          emphasis: {
            itemStyle: {
              areaColor: '#e5e7eb',
            },
            label: {
              color: '#000',
            },
          },
        },
        series: [
          {
            type: 'map',
            map: 'China',
            geoIndex: 0,
            data: [],
          },
          {
            name: '水系',
            type: 'custom',
            coordinateSystem: 'geo',
            renderItem: (params: any, api: any) => {
              const index = params.dataIndex
              const item = waterBodyCoords[index]
              const coordinates = item.coordinates
              const isHovered = index === hoveredIndex

              if (!coordinates) {
                return {
                  type: 'group',
                  children: [],
                }
              }

              if (item.type === 'LineString') {
                const points = coordinates.map((coord: number[]) => api.coord([coord[0], coord[1]]))
                const midIndex = Math.floor(coordinates.length / 2)
                const textCoord = api.coord([coordinates[midIndex][0], coordinates[midIndex][1]])

                return {
                  type: 'group',
                  children: [
                    {
                      type: 'polyline',
                      shape: {
                        points,
                      },
                      style: api.style({
                        stroke: '#0077be',
                        lineWidth: isHovered ? 3 : 1.5,
                        opacity: isHovered ? 1 : 0.6,
                        fill: 'none',
                      }),
                    },
                    ...(isHovered
                      ? [{
                          type: 'text',
                          style: {
                            text: item.name,
                            textFont: api.font({ fontSize: 12, fontWeight: 'bold' }),
                            textFill: '#0077be',
                            textAlign: 'center',
                            textVerticalAlign: 'middle',
                            x: textCoord[0],
                            y: textCoord[1],
                            textBackgroundColor: 'rgba(255, 255, 255, 0.8)',
                            textPadding: [2, 4],
                          },
                        }]
                      : []),
                  ],
                  cursor: 'pointer',
                }
              }

              return {
                type: 'group',
                children: [],
              }
            },
            data: waterBodyCoords,
            z: 100,
          },
        ],
      })

      // 绑定事件监听
      const chart = chartRef.current?.getEchartsInstance()
      if (chart) {
        chart.off('mouseover')
        chart.off('mouseout')
        chart.off('click')

        chart.on('mouseover', (params: any) => {
          if (params.seriesName === '水系' && params.dataIndex !== undefined) {
            setHoveredIndex(params.dataIndex)
          }
        })

        chart.on('mouseout', () => {
          setHoveredIndex(null)
        })

        chart.on('click', (params: any) => {
          if (params.seriesName === '水系' && params.dataIndex !== undefined) {
            const item = waterBodyCoords[params.dataIndex]
            console.log('Clicked:', item.name)
          }
        })
      }
    }).catch((error) => {
      console.error('加载地图数据失败:', error)
    })
  }, [hoveredIndex])

  return (
    <div className="w-full h-screen">
      <ReactECharts
        ref={chartRef}
        option={mapOption}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  )
}

export default Map
