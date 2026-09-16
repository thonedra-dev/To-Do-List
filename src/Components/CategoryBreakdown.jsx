import { CATEGORY_LABELS, CATEGORY_DOT_VAR } from '../api';

/**
 * Per-category done/total rows under the progress ring.
 * Iterates the fixed CATEGORY_LABELS list (not just categories present in
 * the data), same as the original — so every category always shows even
 * at 0/0.
 */
export default function CategoryBreakdown({ tasks }) {
  return (
    <div className="cat-list" id="cat-list">
      {CATEGORY_LABELS.map((cat) => {
        const catTasks = tasks.filter((t) => (t.related || 'Other') === cat);
        const done = catTasks.filter((t) => t.completed).length;
        const total = catTasks.length;

        return (
          <div className="cat-row" key={cat}>
            <span className="cat-name">
              <span className="cat-dot" style={{ background: CATEGORY_DOT_VAR[cat] }}></span>
              {cat}
            </span>
            <span className="cat-count">{done}/{total}</span>
          </div>
        );
      })}
    </div>
  );
}