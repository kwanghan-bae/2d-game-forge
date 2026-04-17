/**
 * 월드 맵의 지형 생성 및 타일 배치 로직을 담당하는 클래스입니다.
 */
export class WorldMapGenerator {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * 기본 지형 레이어를 생성합니다.
     */
    public generateTerrain(map: Phaser.Tilemaps.Tilemap, groundLayer: Phaser.Tilemaps.TilemapLayer): void {
        const baseTile = map.getTileset('joseon_tileset')?.firstgid || 6;
        const biomes = this.getBiomeStarts(map);

        for (let y = 0; y < 100; y++) {
            this.generateRow(y, groundLayer, baseTile, biomes);
        }
    }

    /** 한 줄의 타일 생성 */
    private generateRow(y: number, layer: Phaser.Tilemaps.TilemapLayer, base: number, biomes: any) {
        for (let x = 0; x < 100; x++) {
            layer.putTileAt(this.getBiomeTile(x, y, base, biomes), x, y);
        }
    }

    /** 바이옴 시작 타일 정보 추출 */
    private getBiomeStarts(map: Phaser.Tilemaps.Tilemap) {
        return {
            b1: map.getTileset('tileset_biome_1')?.firstgid || 0,
            b2: map.getTileset('tileset_biome_2')?.firstgid || 0,
            b4: map.getTileset('tileset_biome_4')?.firstgid || 0
        };
    }

    /** 특정 위치의 바이옴 타일 결정 */
    private getBiomeTile(x: number, y: number, def: number, biomes: any): number {
        if (y < 35) return this.getUpperBiome(x, def, biomes);
        if (y > 65) return this.getLowerBiome(x, def, biomes);
        return def;
    }

    /** 상단 바이옴 결정 */
    private getUpperBiome(x: number, def: number, biomes: any): number {
        if (x < 35 && biomes.b1) return biomes.b1 + 42;
        if (x > 65 && biomes.b2) return biomes.b2 + 520;
        return def;
    }

    /** 하단 바이옴 결정 */
    private getLowerBiome(x: number, def: number, biomes: any): number {
        if (x > 65 && biomes.b4) return biomes.b4 + 440;
        if (x < 35 && biomes.b2) return biomes.b2 + 215;
        return def;
    }

    /** 특수 지점 건설 */
    public buildPointsOfInterest(map: Phaser.Tilemaps.Tilemap, decorLayer: Phaser.Tilemaps.TilemapLayer): void {
        this.fillArea({
            layer: decorLayer, startX: 45, startY: 43,
            width: 10, height: 10, tileIndex: 13
        });

        // 약수터 배치 (한양 인근 3개소)
        const yaksuPoints = [
            { x: 42, y: 48 },
            { x: 58, y: 42 },
            { x: 52, y: 58 }
        ];

        yaksuPoints.forEach(p => {
            decorLayer.putTileAt(25, p.x, p.y);
        });
    }

    /** 영역 채우기 */
    private fillArea(opt: any) {
        const { layer, startX, startY, width, height, tileIndex } = opt;
        for (let x = startX; x < startX + width; x++) {
            for (let y = startY; y < startY + height; y++) {
                layer.putTileAt(tileIndex, x, y);
            }
        }
    }
}
