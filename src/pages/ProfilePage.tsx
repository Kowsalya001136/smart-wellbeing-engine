import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, LogOut, Save } from "lucide-react";

const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    age: "",
    height_cm: "",
    weight_kg: "",
    gender: "",
    activity_level: "",
    fitness_goal: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            full_name: data.full_name || "",
            age: data.age?.toString() || "",
            height_cm: data.height_cm?.toString() || "",
            weight_kg: data.weight_kg?.toString() || "",
            gender: data.gender || "",
            activity_level: data.activity_level || "",
            fitness_goal: data.fitness_goal || "",
          });
        }
        setLoading(false);
      });
  }, [user]);

  const calculateMetrics = () => {
    const age = Number(form.age);
    const height = Number(form.height_cm);
    const weight = Number(form.weight_kg);
    if (!age || !height || !weight || !form.gender) return null;

    const bmi = weight / Math.pow(height / 100, 2);

    // Mifflin-St Jeor
    let bmr: number;
    if (form.gender === "male") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    const multiplier = activityMultipliers[form.activity_level] || 1.2;
    const dailyCalories = bmr * multiplier;

    return { bmi: Math.round(bmi * 10) / 10, bmr: Math.round(bmr), daily_calories: Math.round(dailyCalories) };
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const metrics = calculateMetrics();

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        age: form.age ? Number(form.age) : null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        gender: form.gender || null,
        activity_level: form.activity_level || null,
        fitness_goal: form.fitness_goal || null,
        ...(metrics || {}),
      })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile saved!");
    }
  };

  const metrics = calculateMetrics();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Your Profile</h1>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>

      <div className="glass-card p-6 space-y-5">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Age</Label>
            <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Height (cm)</Label>
            <Input type="number" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Weight (kg)</Label>
            <Input type="number" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Activity Level</Label>
          <Select value={form.activity_level} onValueChange={(v) => setForm({ ...form, activity_level: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sedentary">Sedentary</SelectItem>
              <SelectItem value="light">Lightly Active</SelectItem>
              <SelectItem value="moderate">Moderately Active</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="very_active">Very Active</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Fitness Goal</Label>
          <Select value={form.fitness_goal} onValueChange={(v) => setForm({ ...form, fitness_goal: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lose_weight">Lose Weight</SelectItem>
              <SelectItem value="maintain">Maintain Weight</SelectItem>
              <SelectItem value="build_muscle">Build Muscle</SelectItem>
              <SelectItem value="improve_endurance">Improve Endurance</SelectItem>
              <SelectItem value="general_fitness">General Fitness</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Profile
        </Button>
      </div>

      {metrics && (
        <div className="glass-card p-6 glow-border">
          <h3 className="font-display font-semibold mb-3">Your Metrics</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="stat-value text-xl">{metrics.bmi}</p>
              <p className="stat-label text-xs">BMI</p>
            </div>
            <div>
              <p className="stat-value text-xl">{metrics.bmr}</p>
              <p className="stat-label text-xs">BMR</p>
            </div>
            <div>
              <p className="stat-value text-xl">{metrics.daily_calories}</p>
              <p className="stat-label text-xs">Daily Cal</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
