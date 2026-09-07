import { useEffect, useRef } from 'react';
import { createDraggable, createScope, spring } from 'animejs';
import './DraggableTitle.css';

/**
 * 可拖拽标题：完全按 anime.js v4 官方 React 示例实现。
 * - createScope 把动画实例限定在 root 内，卸载时 scope.revert() 统一清理；
 * - container: [0,0,0,0] 把释放目标夹回原点（拖动过程仍自由跟手）；
 * - releaseEase: spring({ bounce: 0.7 }) 用带弹性的物理弹簧做释放回弹，
 *   bounce 越大越 Q 弹（过冲 + 振荡），快速一甩还带惯性。
 */
export default function DraggableTitle() {
  const root = useRef<HTMLHeadingElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  useEffect(() => {
    scopeRef.current = createScope({ root }).add(() => {
      createDraggable(root.current!, {
        container: [0, 0, 0, 0],
        releaseEase: spring({ bounce: 0.7 }),
      });
    });
    return () => scopeRef.current?.revert();
  }, []);

  return (
    <h1 ref={root} className="home__title draggable-title">
      Vec-Note
    </h1>
  );
}
