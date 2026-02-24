import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dumbbell, Loader2, Sparkles, Check, Trash2 } from "lucide-react";

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
}

const WorkoutsPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchPlans = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("workout_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setPlans(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, [user]);

  const generatePlan = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const response = await supabase.functions.invoke("generate-workout", {
        body: { profile },
      });

      if (response.error) throw new Error(response.error.message);
      const plan = response.data;

      const { error } = await supabase.from("workout_plans").insert({
        user_id: user.id,
        title: plan.title,
        description: plan.description,
        exercises: plan.exercises,
        difficulty: plan.difficulty,
        duration_minutes: plan.duration_minutes,
        ai_generated: true,
        scheduled_date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;
      toast.success("Workout plan generated!");
      fetchPlans();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate workout");
    } finally {
      setGenerating(false);
    }
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    await supabase.from("workout_plans").update({ completed: !completed }).eq("id", id);
    setPlans(plans.map((p) => (p.id === id ? { ...p, completed: !completed } : p)));
  };

  const deletePlan = async (id: string) => {
    await supabase.from("workout_plans").delete().eq("id", id);
    setPlans(plans.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Workouts</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-generated plans tailored to you</p>
        </div>
        <Button onClick={generatePlan} disabled={generating}>
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate Plan
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Dumbbell className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium mb-2">No workouts yet</p>
          <p className="text-sm">Click "Generate Plan" to get your first AI workout!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => {
            const exercises: Exercise[] = Array.isArray(plan.exercises) ? plan.exercises : [];
            return (
              <div key={plan.id} className={`glass-card p-5 animate-slide-up ${plan.completed ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display font-semibold text-lg">{plan.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      {plan.difficulty && (
                        <span className="text-xs font-medium uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {plan.difficulty}
                        </span>
                      )}
                      {plan.duration_minutes && (
                        <span className="text-xs text-muted-foreground">{plan.duration_minutes} min</span>
                      )}
                      {plan.ai_generated && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> AI Generated
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleComplete(plan.id, plan.completed)}
                      className={plan.completed ? "text-primary" : "text-muted-foreground"}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => deletePlan(plan.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {plan.description && <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>}
                {exercises.length > 0 && (
                  <div className="space-y-2">
                    {exercises.map((ex, i) => (
                      <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2 text-sm">
                        <span className="font-medium">{ex.name}</span>
                        <span className="text-muted-foreground">
                          {ex.sets} × {ex.reps} • {ex.rest_seconds}s rest
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkoutsPage;
