import geopandas as gpd
import os
from pathlib import Path

def convert_shp_to_geojson(input_dir, output_dir):
    """
    将指定目录下的所有shp文件转换为geojson格式
    """
    # 确保输出目录存在
    os.makedirs(output_dir, exist_ok=True)
    
    # 遍历目录
    for root, dirs, files in os.walk(input_dir):
        for file in files:
            if file.endswith('.shp'):
                input_path = os.path.join(root, file)
                # 创建相对输出路径
                rel_path = os.path.relpath(root, input_dir)
                output_subdir = os.path.join(output_dir, rel_path)
                os.makedirs(output_subdir, exist_ok=True)
                
                # 设置输出文件名
                output_filename = os.path.splitext(file)[0] + '.geojson'
                output_path = os.path.join(output_subdir, output_filename)
                
                print(f"Converting {input_path} to {output_path}")
                try:
                    # 读取shp文件
                    gdf = gpd.read_file(input_path)
                    # 转换为WGS84坐标系
                    gdf = gdf.to_crs('EPSG:4326')
                    # 保存为geojson
                    gdf.to_file(output_path, driver='GeoJSON')
                    print(f"Successfully converted {file}")
                except Exception as e:
                    print(f"Error converting {file}: {str(e)}")

def main():
    # 设置基础路径
    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / 'data'
    
    # 设置输出目录
    output_base = base_dir / 'public' / 'geojson'
    
    # 处理水系数据
    water_dir = data_dir / 'water'
    water_output = output_base / 'water'
    if water_dir.exists():
        convert_shp_to_geojson(str(water_dir), str(water_output))
    
    # 处理山脉数据
    # mountain_dir = data_dir / 'mountain'
    # mountain_output = output_base / 'mountain'
    # if mountain_dir.exists():
    #     convert_shp_to_geojson(str(mountain_dir), str(mountain_output))

if __name__ == '__main__':
    main()
