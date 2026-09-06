import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * 兜底错误边界：捕获子树内的渲染/生命周期错误。
 * 触发时回调 toast 提示，并展示可「重新加载」的降级面板，
 * 而不是让整站白屏。点击重试会先尝试原地恢复一次。
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode; onError?: (message: string) => void },
  { failed: boolean; attempt: number }
> {
  state = { failed: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo) {
    this.props.onError?.(error instanceof Error ? error.message : String(error));
  }

  private retry = () => {
    const { attempt } = this.state;
    if (attempt >= 1) {
      window.location.reload();
      return;
    }
    // 先原地重挂一次；若再次失败则建议整页刷新
    this.setState({ failed: false, attempt: attempt + 1 });
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="boundary-fallback" role="alert">
        <p className="boundary-fallback__msg">页面出了一点问题，功能不受影响，请重试或刷新。</p>
        <button type="button" className="btn btn--solid btn--sm" onClick={this.retry}>
          重试
        </button>
      </div>
    );
  }
}
