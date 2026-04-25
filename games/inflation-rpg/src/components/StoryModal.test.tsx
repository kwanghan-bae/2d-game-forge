import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoryModal } from './StoryModal';

describe('StoryModal', () => {
  it('renders title and text', () => {
    render(<StoryModal title="조선 평야" textKR="바람이 분다." onClose={() => {}} />);
    expect(screen.getByText('조선 평야')).toBeInTheDocument();
    expect(screen.getByText('바람이 분다.')).toBeInTheDocument();
  });

  it('renders emoji when provided', () => {
    render(<StoryModal title="t" emoji="🏘️" textKR="x" onClose={() => {}} />);
    expect(screen.getByText('🏘️')).toBeInTheDocument();
  });

  it('calls onClose when 확인 clicked', () => {
    const onClose = vi.fn();
    render(<StoryModal title="t" textKR="x" onClose={onClose} />);
    fireEvent.click(screen.getByText('확인'));
    expect(onClose).toHaveBeenCalled();
  });
});
