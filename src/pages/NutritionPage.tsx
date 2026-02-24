import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Apple, Loader2, Plus, Trash2, Sparkles } from "lucide-react";

const NutritionPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [foodInput, setFoodInput] = useState("");
  const [mealType, setMealType] = useState("lunch");

  const fetchLogs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("nutrition_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(20);
    setLogs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const analyzeAndLog = async () => {
    if (!foodInput.trim() || !user) return;
    setAnalyzing(true);

    try {
      const response = await supabase.functions.invoke("analyze-nutrition", {
        body: { food_description: foodInput, meal_type: mealType },
      });

      if (response.error) throw new Error(response.error.message);

      const analysis = response.data;

      const { error } = await supabase.from("nutrition_logs").insert({
        user_id: user.id,
        food_description: foodInput,
        calories: analysis.calories,
        protein_g: analysis.protein_g,
        carbs_g: analysis.carbs_g,
        fat_g: analysis.fat_g,
        meal_type: mealType,
        ai_analysis: analysis.analysis,
      });

      if (error) throw error;

      toast.success("Food logged & analyzed!");
      setFoodInput("");
      fetchLogs();
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze food");
    } finally {
      setAnalyzing(false);
    }
  };

  const deleteLog = async (id: string) => {
    await supabase.from("nutrition_logs").delete().eq("id", id);
    setLogs(logs.filter((l) => l.id !== id));
  };

  const todayCalories = logs
    .filter((l) => new Date(l.logged_at).toDateString() === new Date().toDateString())
    .reduce((sum, l) => sum + (Number(l.calories) || 0), 0);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">Nutrition</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Log your meals — AI estimates calories & macros
        </p>
      </div>

      <div className="glass-card p-5 glow-border">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold">AI Food Analyzer</h3>
        </div>
        <Textarea
          value={foodInput}
          onChange={(e) => setFoodInput(e.target.value)}
          placeholder="Describe what you ate, e.g. '2 eggs, toast with butter, orange juice'"
          className="mb-3"
          rows={3}
        />
        <div className="flex gap-3">
          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={analyzeAndLog} disabled={analyzing || !foodInput.trim()} className="flex-1">
            {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Analyze & Log
          </Button>
        </div>
      </div>

      <div className="glass-card p-4">
        <p className="text-sm text-muted-foreground">Today's Total</p>
        <p className="stat-value text-primary">{todayCalories} <span className="text-base text-muted-foreground">kcal</span></p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Apple className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No meals logged yet. Start by adding your first meal above!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="glass-card p-4 animate-slide-up">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {log.meal_type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.logged_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{log.food_description}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {log.calories && <span><strong className="text-foreground">{log.calories}</strong> kcal</span>}
                    {log.protein_g && <span><strong className="text-foreground">{log.protein_g}g</strong> protein</span>}
                    {log.carbs_g && <span><strong className="text-foreground">{log.carbs_g}g</strong> carbs</span>}
                    {log.fat_g && <span><strong className="text-foreground">{log.fat_g}g</strong> fat</span>}
                  </div>
                  {log.ai_analysis && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{log.ai_analysis}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => deleteLog(log.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NutritionPage;
