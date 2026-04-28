export default function DashboardCards({ cards }) {
  return (
    <div className="equipment-stat-grid">
      {cards.map((card) => (
        <div key={card.label} className="equipment-stat-card">
          <div>{card.label}</div>
          <strong>{card.value}</strong>
        </div>
      ))}
    </div>
  );
}
