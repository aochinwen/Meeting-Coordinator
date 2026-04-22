import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownContent } from '@/components/MarkdownContent';

describe('MarkdownContent', () => {
  it('renders basic markdown formatting', () => {
    render(<MarkdownContent markdown={'# Title\n\n- one\n- two\n\n**bold** and *italic*'} />);

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('one')).toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText('italic')).toBeInTheDocument();
  });

  it('sanitizes unsafe html', () => {
    render(<MarkdownContent markdown={'<script>alert(1)</script>safe'} />);

    expect(screen.getByText(/safe/)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
