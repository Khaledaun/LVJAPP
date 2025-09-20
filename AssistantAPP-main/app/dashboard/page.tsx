export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your case management dashboard.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-2">Total Cases</h3>
          <p className="text-2xl font-bold text-accent">24</p>
          <p className="text-sm text-muted-foreground">Active cases</p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-2">Pending Review</h3>
          <p className="text-2xl font-bold text-primary">8</p>
          <p className="text-sm text-muted-foreground">Requiring attention</p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-2">Completed This Month</h3>
          <p className="text-2xl font-bold text-green-600">12</p>
          <p className="text-sm text-muted-foreground">Successfully processed</p>
        </div>
      </div>
      
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-foreground mb-4">Recent Activity</h3>
        <p className="text-muted-foreground">Recent case updates and notifications will appear here.</p>
      </div>
    </div>
  );
}
