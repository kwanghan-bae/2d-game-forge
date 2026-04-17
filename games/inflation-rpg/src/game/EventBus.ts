import { Events } from 'phaser';

/**
 * React 컴포넌트와 Phaser 게임 씬 간의 통신(이벤트 송수신)을 담당하는 전역 이벤트 버스입니다.
 * https://newdocs.phaser.io/docs/3.70.0/Phaser.Events.EventEmitter
 */
export const EventBus = new Events.EventEmitter();
