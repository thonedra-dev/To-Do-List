const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

/**
 * Search field + sort select + filter tabs above the task list.
 * Fully controlled by the parent (Dashboard/TaskList owns the actual
 * filtering/sorting logic in useMemo, same division of labor as the
 * original getFilteredSortedTasks()).
 */
export default function TaskToolbar({
  search,
  onSearchChange,
  sortBy,
  onSortChange,
  filter,
  onFilterChange,
  counts, // { all, today, upcoming, completed }
}) {
  return (
    <>
      <div className="list-toolbar">
        <div className="search-field">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            id="search-input"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="sort-field">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          <select id="sort-select" value={sortBy} onChange={(e) => onSortChange(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="priority">Priority</option>
            <option value="due">Due Date</option>
          </select>
        </div>
      </div>

      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-tab${filter === f.key ? ' active' : ''}`}
            data-filter={f.key}
            onClick={() => onFilterChange(f.key)}
          >
            {f.label} <span className="tab-count" id={`count-${f.key}`}>{counts[f.key] ?? 0}</span>
          </button>
        ))}
      </div>
    </>
  );
}