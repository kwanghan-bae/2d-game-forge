import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillProgression } from './SkillProgression';
import { useGameStore, INITIAL_META, INITIAL_RUN } from '../store/gameStore';

beforeEach(() => {
  useGameStore.setState({
    screen: 'skill-progression',
    run: { ...INITIAL_RUN, characterId: 'hwarang' },
    meta: { ...INITIAL_META, lastPlayedCharId: 'hwarang' },
  });
});

describe('SkillProgression', () => {
  it('renders header with current char + JP / cap', () => {
    render(<SkillProgression />);
    expect(screen.getByText(/직업소/)).toBeInTheDocument();
    expect(screen.getByTestId('jp-cap')).toHaveTextContent('/50');
  });

  it('shows base skill cards for hwarang (2 base skills)', () => {
    render(<SkillProgression />);
    expect(screen.getByText('화랑일격')).toBeInTheDocument();
    expect(screen.getByText('돌격')).toBeInTheDocument();
  });

  it('+1 버튼 클릭 → JP 충분 시 levelUp', () => {
    useGameStore.setState((s) => ({ meta: { ...s.meta, jp: { hwarang: 10 } } }));
    render(<SkillProgression />);
    const btns = screen.getAllByRole('button', { name: /\+1/ });
    fireEvent.click(btns[0]!);
    const lvls = useGameStore.getState().meta.skillLevels.hwarang ?? {};
    expect(Object.values(lvls).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('shows ULT slot 1 잠김 표시 (총 lv 0 < 50)', () => {
    render(<SkillProgression />);
    expect(screen.getByText(/0\/50 필요/)).toBeInTheDocument();
  });

  it('shows ULT slot 1 unlock 시 비어있음 + 선택 버튼들', () => {
    useGameStore.setState((s) => ({
      meta: {
        ...s.meta,
        skillLevels: { hwarang: { 'hwarang-strike': 50 } },
      },
    }));
    render(<SkillProgression />);
    // ULT slot 1 should be visible and have ULT picker buttons
    expect(screen.getByTestId('ult-slot-0-empty')).toBeInTheDocument();
  });

  it('광고 버튼 클릭 → cap +50', () => {
    render(<SkillProgression />);
    const adBtn = screen.getByTestId('watch-ad-btn');
    fireEvent.click(adBtn);
    expect(useGameStore.getState().meta.jpCap.hwarang).toBe(100);
  });
});
