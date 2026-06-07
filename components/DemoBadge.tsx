export function DemoBadge({ note }: { note: string }) {
  return (
    <div style={{
      background: "#fffbf0",
      border: "1px solid #fde68a",
      borderRadius: "6px",
      padding: "8px 14px",
      marginBottom: "16px",
      display: "flex",
      alignItems: "flex-start",
      gap: "8px",
    }}>
      <span style={{
        fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em",
        color: "#92400e", whiteSpace: "nowrap",
        background: "#fef3c7", padding: "1px 6px", borderRadius: "4px",
        border: "1px solid #fde68a",
      }}>
        예시
      </span>
      <span style={{ fontSize: "11px", color: "#b45309", lineHeight: 1.55 }}>
        {note}
      </span>
    </div>
  );
}
