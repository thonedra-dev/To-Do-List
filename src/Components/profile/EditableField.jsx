// ✅ AFTER
export default function EditableField({ label, value, editing, onChange, type = "text", options }) {
  return (
    <div className="detail-item">
      <label>{label}</label>
      {!editing && <p>{value || `No ${label} Provided`}</p>}
      {editing && type === "select" && (
        <select className="edit-active" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>Select {label}</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
      {editing && type !== "select" && (
        <input
          type={type}
          className="edit-active"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}