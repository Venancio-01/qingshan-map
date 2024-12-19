import os
import geopandas as gpd
from pathlib import Path


def process_mountain_data():
    # 设置基础路径
    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / "data"

    # 设置输入和输出路径
    input_dir = data_dir / "mountain"
    output_dir = base_dir / "public" / "geojson" / "mountain"

    # 创建输出目录（如果不存在）
    output_dir.mkdir(parents=True, exist_ok=True)

    # 存储所有省份的GeoDataFrame
    all_mountains = []

    # 遍历所有省份文件夹
    for mountain in list(input_dir.glob("*")):
        if mountain.is_dir():
            for mountainFile in list(mountain.glob("*.shp")):
                print(f"处理 {mountainFile.name} 的数据...")
                # 读取shp文件
                gdf = gpd.read_file(mountainFile)
                all_mountains.append(gdf)
        else:
            if mountain.suffix == ".shp":
                print(f"处理 {mountain.name} 的数据...")
                # 读取shp文件
                gdf = gpd.read_file(mountain)
                all_mountains.append(gdf)

    if all_mountains:
        # 合并所有GeoDataFrame
        print("合并所有省份的数据...")
        combined_gdf = gpd.pd.concat(all_mountains, ignore_index=True)

        # 输出为GeoJSON
        output_file = output_dir / "mountains.geojson"
        print(f"保存GeoJSON到 {output_file}")
        combined_gdf.to_file(output_file, driver="GeoJSON")
        print("处理完成！")
    else:
        print("未找到任何山脉数据文件！")


def process_water_data():
    # 设置基础路径
    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / "data"

    # 设置输入和输出路径
    input_dir = data_dir / "water"
    output_dir = base_dir / "public" / "geojson" / "water"

    # 创建输出目录（如果不存在）
    output_dir.mkdir(parents=True, exist_ok=True)

    # 存储所有省份的GeoDataFrame
    all_waters = []

    # 遍历所有省份文件夹
    for waterFile in list(input_dir.glob("*")):
        if waterFile.is_dir():
            for waterFile in list(waterFile.glob("*.shp")):
                print(f"处理 {waterFile.name} 的数据...")
                # 读取shp文件
                gdf = gpd.read_file(waterFile)
                all_waters.append(gdf)
        else:
            if waterFile.suffix == ".shp":
                print(f"处理 {waterFile.name} 的数据...")
                # 读取shp文件
                gdf = gpd.read_file(waterFile)
                all_waters.append(gdf)

    print(all_waters)
    if all_waters:
        # 合并所有GeoDataFrame
        print("合并所有省份的数据...")
        combined_gdf = gpd.pd.concat(all_waters, ignore_index=True)

        # 输出为GeoJSON
        output_file = output_dir / "waters.geojson"
        print(f"保存GeoJSON到 {output_file}")
        combined_gdf.to_file(output_file, driver="GeoJSON")
        print("处理完成！")
    else:
        print("未找到任何水系数据文件！")


if __name__ == "__main__":
    # process_mountain_data()
    process_water_data()
