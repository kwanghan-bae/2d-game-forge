import { Page } from '@playwright/test';

/**
 * E2E 테스트를 위한 도우미 클래스입니다.
 * 브라우저 환경에서 실행되는 게임 인스턴스에 접근하여 상태를 조작하거나 확인하는 유틸리티 메서드들을 제공합니다.
 */
export class GameTestHelper {
    /**
     * GameTestHelper의 생성자입니다.
     * @param page Playwright Page 객체
     */
    constructor(private page: Page) {}

    /**
     * 특정 씬이 활성화될 때까지 대기합니다.
     * @param sceneKey 대기할 씬의 키
     * @param timeout 최대 대기 시간 (밀리초)
     */
    async waitForScene(sceneKey: string, timeout: number = 10000) {
        await this.page.waitForFunction(
            (key) => {
                const game = (window as any).phaserGame;
                const scene = game?.scene?.getScenes(true)[0];
                return scene && scene.scene.key === key;
            },
            sceneKey,
            { timeout }
        );
    }

    /**
     * 특정 씬을 강제로 시작합니다.
     * @param sceneKey 시작할 씬의 키
     */
    async startScene(sceneKey: string) {
        await this.page.evaluate((key) => {
            (window as any).phaserGame.scene.getScenes(true)[0].scene.start(key);
        }, sceneKey);
    }

    /**
     * 현재 게임의 상태 정보(레벨, 골드, 체력 등)를 가져옵니다.
     * @returns 게임 상태 객체
     */
    async getGameState() {
        return await this.page.evaluate(() => {
            return {
                level: (window as any).gameState.stats.level,
                gold: (window as any).gameState.stats.gold,
                exp: (window as any).gameState.stats.exp,
                hp: (window as any).gameState.stats.hp,
                zone: (window as any).gameState.stats.zone,
                inventory: (window as any).gameState.inventory.length,
                equipment: Object.keys((window as any).gameState.equipment).length
            };
        });
    }

    /**
     * 플레이어의 골드를 설정합니다.
     * @param amount 설정할 골드 양
     */
    async setGold(amount: number) {
        await this.page.evaluate((gold) => {
            (window as any).gameState.stats.gold = gold;
        }, amount);
    }

    /**
     * E2E 테스트 모드를 활성화합니다 (자동 전투 종료 등).
     */
    async enableE2EMode() {
        await this.page.evaluate(() => {
            (window as any).E2E_AUTO_BATTLE = true;
        });
    }

    /**
     * E2E 테스트 모드를 비활성화합니다.
     */
    async disableE2EMode() {
        await this.page.evaluate(() => {
            (window as any).E2E_AUTO_BATTLE = false;
        });
    }

    /**
     * 전투 인카운터를 강제로 발생시킵니다.
     */
    async triggerBattle() {
        await this.page.evaluate(() => {
            const scene = (window as any).phaserGame.scene.getScenes(true)[0];
            scene.triggerEncounter();
        });
    }

    /**
     * 전투가 종료되고 월드 맵으로 돌아올 때까지 대기합니다.
     * @param timeout 최대 대기 시간
     */
    async waitForBattleEnd(timeout: number = 30000) {
        await this.waitForScene('BattleScene', 10000);
        await this.waitForScene('WorldMap', timeout);
    }

    /**
     * 상점 화면을 엽니다.
     */
    async openShop() {
        await this.page.evaluate(() => {
            const scene = (window as any).phaserGame.scene.getScenes(true)[0];
            scene.scene.start('ShopScene');
        });
        await this.page.waitForTimeout(1000);
    }

    /**
     * 인벤토리 화면을 엽니다.
     */
    async openInventory() {
        await this.page.evaluate(() => {
            const scene = (window as any).phaserGame.scene.getScenes(true)[0];
            scene.scene.start('InventoryScene');
        });
        await this.page.waitForTimeout(1000);
    }

    /**
     * 특정 씬이 현재 활성 상태인지 확인합니다.
     * @param sceneKey 확인할 씬의 키
     * @returns 활성 여부
     */
    async isSceneActive(sceneKey: string): Promise<boolean> {
        return await this.page.evaluate((key) => {
            const scenes = (window as any).phaserGame.scene.getScenes(true);
            return scenes.some((s: any) => s.scene.key === key);
        }, sceneKey);
    }

    /**
     * 현재 게임의 인플레이션율을 가져옵니다.
     * @returns 인플레이션율
     */
    async getInflationRate(): Promise<number> {
        return await this.page.evaluate(() => {
            return (window as any).inflationManager.getInflationRate();
        });
    }

    /**
     * 게임의 인플레이션율을 설정합니다.
     * @param rate 설정할 비율
     */
    async setInflationRate(rate: number) {
        await this.page.evaluate((r) => {
            (window as any).inflationManager.setInflationRate(r);
        }, rate);
    }

    /**
     * 지정된 시간만큼 시간이 경과한 것처럼 시뮬레이션합니다.
     * @param minutes 경과시킬 분 단위 시간
     */
    async simulateTimeElapsed(minutes: number) {
        await this.page.evaluate((mins) => {
            const manager = (window as any).inflationManager;
            const targetTime = manager.getStartTime() - (mins * 60000);
            manager.startTime = targetTime;
        }, minutes);
    }

    /**
     * 로컬 스토리지의 모든 저장 데이터를 삭제합니다.
     */
    async clearSaveData() {
        await this.page.evaluate(() => {
            try {
                localStorage.clear();
            } catch (e) {
                console.warn('localStorage access denied', e);
            }
        });
    }

    /**
     * 인벤토리에 아이템을 추가합니다.
     * @param item 추가할 아이템 객체
     */
    async addItemToInventory(item: any) {
        await this.page.evaluate((itm) => {
            (window as any).gameState.inventory.push(itm);
        }, item);
    }

    /**
     * 현재 인벤토리에 들어있는 아이템 개수를 가져옵니다.
     * @returns 아이템 개수
     */
    async getInventorySize(): Promise<number> {
        return await this.page.evaluate(() => {
            return (window as any).gameState.inventory.length;
        });
    }

    /**
     * 플레이어를 상하좌우 방향으로 이동시킵니다.
     * @param direction 이동 방향
     * @param steps 이동할 칸 수
     */
    async move(direction: 'up' | 'down' | 'left' | 'right', steps: number = 1) {
        const keyMap = {
            up: 'ArrowUp',
            down: 'ArrowDown',
            left: 'ArrowLeft',
            right: 'ArrowRight'
        };

        for (let i = 0; i < steps; i++) {
            await this.page.keyboard.press(keyMap[direction]);
            await this.page.waitForTimeout(100);
        }
    }

    /**
     * 지정된 횟수만큼 전투를 반복 수행합니다.
     * @param count 반복 횟수
     */
    async repeatBattles(count: number) {
        for (let i = 0; i < count; i++) {
            await this.triggerBattle();
            await this.waitForBattleEnd();
            await this.page.waitForTimeout(500);
        }
    }

    /**
     * 특정 보스 몬스터와의 전투를 강제로 시작합니다.
     * @param bossId 보스 몬스터 ID
     */
    async triggerBossBattle(bossId: number) {
        await this.page.evaluate((id) => {
            const scene = (window as any).phaserGame.scene.getScenes(true)[0];
            scene.scene.start('BattleScene', { monsterId: id });
        }, bossId);
    }

    /**
     * 플레이어의 현재 업보 수치를 가져옵니다.
     * @returns 업보 수치
     */
    async getKarma(): Promise<number> {
        return await this.page.evaluate(() => {
            const karmaManager = (window as any).KarmaManager.getInstance();
            return karmaManager.getKarma();
        });
    }

    /**
     * 플레이어의 업보 수치를 설정합니다.
     * @param value 설정할 업보 수치
     */
    async setKarma(value: number): Promise<void> {
        await this.page.evaluate((k) => {
            const karmaManager = (window as any).KarmaManager.getInstance();
            karmaManager.setKarma(k);
        }, value);
    }

    /**
     * 지금까지 격파한 보스 몬스터들의 ID 목록을 가져옵니다.
     * @returns 보스 ID 배열
     */
    async getDefeatedBosses(): Promise<number[]> {
        return await this.page.evaluate(() => {
            return (window as any).gameState.defeatedBosses;
        });
    }
}
