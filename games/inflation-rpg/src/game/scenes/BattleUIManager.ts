import { GameState } from '../GameState';
import { I18n } from '../i18n/I18nManager';
import { NumberFormatter } from '../utils/NumberFormatter';
import { MonsterData } from '../data/MonsterData';
import { getSkillsByClass } from '../data/SkillData';
import { SkillManager } from '../core/SkillManager';

/**
 * 전투 화면의 모든 시각적 요소와 사용자 인터페이스를 전담 관리하는 클래스입니다.
 * 체력 바, 데미지 표시, 스킬 버튼, 전투 로그 등의 렌더링을 담당합니다.
 */
export class BattleUIManager {
    /** UI가 그려질 Phaser 씬 객체 */
    private scene: Phaser.Scene;
    /** 플레이어 체력 표시 텍스트 객체 */
    private playerHpText!: Phaser.GameObjects.Text;
    /** 적 체력 표시 텍스트 객체 */
    private enemyHpText!: Phaser.GameObjects.Text;
    /** 실시간 전투 로그 표시 텍스트 객체 */
    private battleLogText!: Phaser.GameObjects.Text;
    /** 플레이어 현재 체력 바 이미지 객체 */
    private playerHpBar!: Phaser.GameObjects.Image;
    /** 적 현재 체력 바 이미지 객체 */
    private enemyHpBar!: Phaser.GameObjects.Image;
    /** 보스 이름 표시 텍스트 객체 (보스전 전용) */
    private bossNameText?: Phaser.GameObjects.Text;
    /** 화면에 배치된 스킬 버튼 및 쿨타임 텍스트 목록 */
    private skillButtons: { button: Phaser.GameObjects.Rectangle; cooldownText: Phaser.GameObjects.Text }[] = [];

    /**
     * BattleUIManager의 생성자입니다.
     * @param scene UI 요소가 배치될 Phaser 씬 인스턴스
     */
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * 전투 중 하단에 표시되는 HUD(헤드업 디스플레이)의 초기 요소를 생성합니다.
     */
    public createHUD(monster: MonsterData | undefined): void {
        const i18n = I18n.getInstance();
        const playerState = GameState.getInstance().stats;
        const enemyName = monster ? (i18n.currentLang === 'ko' ? monster.nameKR : monster.name) : i18n.get('monsters.unknown');

        this.scene.add.image(512, 680, 'UI_Panel_Beige').setDisplaySize(980, 160);

        this.playerHpText = this.scene.add.text(150, 650, `${i18n.get('battle.player_hp')}: ${NumberFormatter.formatCompact(playerState.hp)}/${NumberFormatter.formatCompact(playerState.maxHp)}`, {
            fontFamily: '"Gowun Batang", serif', fontSize: 24, color: '#2d5a27', fontStyle: 'bold'
        });
        this.scene.add.image(150, 630, 'bar_back').setOrigin(0, 0.5).setDisplaySize(200, 20);
        this.playerHpBar = this.scene.add.image(150, 630, 'bar_green').setOrigin(0, 0.5).setDisplaySize(200, 20);

        this.enemyHpText = this.scene.add.text(650, 650, `${enemyName} HP: 0/0`, {
            fontFamily: '"Gowun Batang", serif', fontSize: 24, color: '#8b0000', fontStyle: 'bold'
        });
        this.scene.add.image(650, 630, 'bar_back').setOrigin(0, 0.5).setDisplaySize(200, 20);
        this.enemyHpBar = this.scene.add.image(650, 630, 'bar_red').setOrigin(0, 0.5).setDisplaySize(200, 20);

        this.battleLogText = this.scene.add.text(512, 710, i18n.get('battle.start'), {
            fontFamily: '"Gowun Batang", serif', fontSize: 22, color: '#4a3b2a', align: 'center', fontStyle: 'bold'
        }).setOrigin(0.5);
    }

    /**
     * 플레이어와 적의 현재 체력 수치 및 체력 바를 업데이트합니다.
     */
    public updateHP(enemyHP: number, enemyMaxHP: number): void {
        const playerState = GameState.getInstance().stats;
        this.playerHpText.setText(`${I18n.getInstance().get('battle.player_hp')}: ${NumberFormatter.formatCompact(playerState.hp)}/${NumberFormatter.formatCompact(playerState.maxHp)}`);
        this.enemyHpText.setText(`HP: ${NumberFormatter.formatCompact(enemyHP)}/${NumberFormatter.formatCompact(enemyMaxHP)}`);

        const pRatio = Math.max(0, playerState.hp / playerState.maxHp);
        this.playerHpBar.setDisplaySize(200 * pRatio, 20);
        this.playerHpBar.setTexture(pRatio < 0.3 ? 'bar_yellow' : 'bar_green');

        const eRatio = Math.max(0, enemyHP / enemyMaxHP);
        this.enemyHpBar.setDisplaySize(200 * eRatio, 20);
    }

    /** 전투 로그 표시 */
    public showLog(message: string): void { this.battleLogText.setText(message); }

    /**
     * 데미지 수치 연출 효과를 생성합니다.
     */
    public spawnDamageText(x: number, y: number, damage: number, isCrit: boolean, isPlayer: boolean = false): void {
        const config = this.getDamageTextConfig(isCrit, isPlayer);
        const textStr = isCrit ? `🔥 ${NumberFormatter.formatCompact(damage)}` : `${NumberFormatter.formatCompact(damage)}`;

        const text = this.scene.add.text(x, y - 50, textStr, {
            fontFamily: '"Gowun Batang", serif', fontSize: 32, color: config.color, stroke: '#fff', strokeThickness: 4, fontStyle: 'bold'
        }).setOrigin(0.5).setScale(config.scale);

        this.scene.tweens.add({
            targets: text, y: y - 150, alpha: 0, duration: 1000,
            onComplete: () => text.destroy()
        });
    }

    /** 데미지 텍스트 설정값 반환 */
    private getDamageTextConfig(isCrit: boolean, isPlayer: boolean) {
        if (isPlayer) return { color: '#ff0000', scale: 1.2 };
        if (isCrit) return { color: '#ffaa00', scale: 1.8 };
        return { color: '#4a3b2a', scale: 1.2 };
    }

    /**
     * 플레이어 직업 스킬 버튼들을 생성합니다.
     */
    public createSkillButtons(skillManager: SkillManager, onClick: (id: number) => void): void {
        const cls = GameState.getInstance().selectedClass;
        if (!cls) return;

        const skills = getSkillsByClass(cls);
        const startY = this.scene.scale.height - 80;

        skills.forEach((skill, i) => {
            const x = 100 + i * 90;
            const btn = this.scene.add.rectangle(x, startY, 70, 70, 0x4a3b2a).setStrokeStyle(2, 0xd4af37).setInteractive();
            
            this.scene.add.text(x, startY - 50, skill.name.split(' ')[0], {
                fontSize: '11px', color: '#ffffff', fontFamily: '"Gowun Batang", serif'
            }).setOrigin(0.5);

            const cdText = this.scene.add.text(x, startY, '', {
                fontSize: '18px', color: '#ff0000', fontFamily: '"Gowun Batang", serif', fontStyle: 'bold'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => onClick(skill.id));
            this.skillButtons.push({ button: btn, cooldownText: cdText });
        });
    }

    /**
     * 스킬 쿨타임 정보를 바탕으로 버튼 상태를 갱신합니다.
     */
    public updateSkillCooldowns(skillManager: SkillManager): void {
        const cls = GameState.getInstance().selectedClass;
        if (!cls) return;

        getSkillsByClass(cls).forEach((skill, i) => {
            const ui = this.skillButtons[i];
            if (!ui) return;

            const cd = skillManager.getCooldown(skill.id);
            this.updateButtonVisual(ui.button, ui.cooldownText, cd);
        });
    }

    /** 개별 버튼 시각적 상태 갱신 */
    private updateButtonVisual(btn: Phaser.GameObjects.Rectangle, txt: Phaser.GameObjects.Text, cd: number) {
        if (cd > 0) {
            txt.setText(`${cd}`);
            btn.setFillStyle(0x333333);
        } else {
            txt.setText('');
            btn.setFillStyle(0x4a3b2a);
        }
    }

    /** 보스전 전용 UI 설정 */
    public setupBossUI(monster: MonsterData | undefined): void {
        this.bossNameText = this.scene.add.text(this.scene.scale.width / 2, 100, monster?.nameKR || '', {
            fontFamily: 'Gowun Batang', fontSize: '36px', color: '#FFD700', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);

        if (this.enemyHpBar) this.enemyHpBar.setTint(0xFFD700);
    }
}
