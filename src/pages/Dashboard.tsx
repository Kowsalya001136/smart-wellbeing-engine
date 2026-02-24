import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StatCard from "@/components/StatCard";
import { Flame, Dumbbell, Apple, TrendingUp, Zap, Droplets } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [nutritionData, setNutritionData] = useState<any[]>([]);
  const [workoutData, setWorkoutData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [profileRes, nutritionRes, workoutRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("nutrition_logs").select("*").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(30),
        supabase.from("workout_plans").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(14),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (nutritionRes.data) setNutritionData(nutritionRes.data);
      if (workoutRes.data) setWorkoutData(workoutRes.data);
    };

    fetchData();
  }, [user]);

  const totalCaloriesToday = nutritionData
    .filter((n) => new Date(n.logged_at).toDateString() === new Date().toDateString())
    .reduce((sum, n) => sum + (Number(n.calories) || 0), 0);

  const completedWorkouts = workoutData.filter((w) => w.completed).length;
  const totalWorkouts = workoutData.length;

  // Chart data - last 7 days of calories
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayStr = date.toDateString();
    const dayCalories = nutritionData
      .filter((n) => new Date(n.logged_at).toDateString() === dayStr)
      .reduce((sum, n) => sum + (Number(n.calories) || 0), 0);
    return {
      day: date.toLocaleDateString("en", { weekday: "short" }),
      calories: dayCalories,
    };
  });

  const workoutChart = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayStr = date.toDateString();
    const count = workoutData.filter(
      (w) => w.completed && new Date(w.created_at).toDateString() === dayStr
    ).length;
    return {
      day: date.toLocaleDateString("en", { weekday: "short" }),
      workouts: count,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's your fitness overview for today
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Calories Today"
          value={totalCaloriesToday || "—"}
          icon={<Flame className="h-5 w-5" />}
          trend={profile?.daily_calories ? `/ ${Math.round(profile.daily_calories)}` : undefined}
        />
        <StatCard
          label="Workouts Done"
          value={`${completedWorkouts}/${totalWorkouts}`}
          icon={<Dumbbell className="h-5 w-5" />}
          trend={completedWorkouts > 0 ? "+1" : undefined}
          trendUp
        />
        <StatCard
          label="BMI"
          value={profile?.bmi ? Number(profile.bmi).toFixed(1) : "—"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Daily Target"
          value={profile?.daily_calories ? `${Math.round(profile.daily_calories)}` : "—"}
          icon={<Zap className="h-5 w-5" />}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="font-display font-semibold mb-4">Calorie Intake (7 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={last7Days}>
              <defs>
                <linearGradient id="calorieGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(84, 81%, 44%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(84, 81%, 44%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
              <XAxis dataKey="day" stroke="hsl(220, 10%, 55%)" fontSize={12} />
              <YAxis stroke="hsl(220, 10%, 55%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 18%, 10%)",
                  border: "1px solid hsl(220, 14%, 18%)",
                  borderRadius: "8px",
                  color: "hsl(0, 0%, 95%)",
                }}
              />
              <Area
                type="monotone"
                dataKey="calories"
                stroke="hsl(84, 81%, 44%)"
                fill="url(#calorieGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-display font-semibold mb-4">Workouts (7 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={workoutChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
              <XAxis dataKey="day" stroke="hsl(220, 10%, 55%)" fontSize={12} />
              <YAxis stroke="hsl(220, 10%, 55%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 18%, 10%)",
                  border: "1px solid hsl(220, 14%, 18%)",
                  borderRadius: "8px",
                  color: "hsl(0, 0%, 95%)",
                }}
              />
              <Bar dataKey="workouts" fill="hsl(84, 81%, 44%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
