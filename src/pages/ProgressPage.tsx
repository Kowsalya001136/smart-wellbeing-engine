import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const ProgressPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  const fetchLogs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("progress_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: true })
      .limit(60);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const addLog = async () => {
    if (!user || !weight) return;
    const { error } = await supabase.from("progress_logs").insert({
      user_id: user.id,
      weight_kg: Number(weight),
      notes: notes || null,
    });
    if (error) {
      toast.error("Failed to log progress");
    } else {
      toast.success("Progress logged!");
      setWeight("");
      setNotes("");
      fetchLogs();
    }
  };

  const chartData = logs.map((l) => ({
    date: new Date(l.logged_at).toLocaleDateString("en", { month: "short", day: "numeric" }),
    weight: Number(l.weight_kg),
  }));

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">Progress</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your weight over time</p>
      </div>

      <div className="glass-card p-5">
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-2">
            <Label>Weight (kg)</Label>
            <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 75" />
          </div>
          <div className="flex-1 space-y-2">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How do you feel?" />
          </div>
          <Button onClick={addLog} disabled={!weight}>
            <Plus className="mr-2 h-4 w-4" /> Log
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : chartData.length > 1 ? (
        <div className="glass-card p-5">
          <h3 className="font-display font-semibold mb-4">Weight Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
              <XAxis dataKey="date" stroke="hsl(220, 10%, 55%)" fontSize={12} />
              <YAxis domain={["auto", "auto"]} stroke="hsl(220, 10%, 55%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 18%, 10%)",
                  border: "1px solid hsl(220, 14%, 18%)",
                  borderRadius: "8px",
                  color: "hsl(0, 0%, 95%)",
                }}
              />
              <Line type="monotone" dataKey="weight" stroke="hsl(84, 81%, 44%)" strokeWidth={2} dot={{ fill: "hsl(84, 81%, 44%)", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Log at least 2 entries to see your trend chart.</p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-2">
          {[...logs].reverse().slice(0, 10).map((log) => (
            <div key={log.id} className="glass-card p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{new Date(log.logged_at).toLocaleDateString()}</span>
              <span className="font-semibold">{Number(log.weight_kg).toFixed(1)} kg</span>
              {log.notes && <span className="text-muted-foreground text-xs truncate max-w-32">{log.notes}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgressPage;
