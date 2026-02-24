import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("API key not configured");

    const profileContext = profile
      ? `User profile: Age ${profile.age || "unknown"}, Gender ${profile.gender || "unknown"}, Weight ${profile.weight_kg || "unknown"}kg, Height ${profile.height_cm || "unknown"}cm, Activity level: ${profile.activity_level || "unknown"}, Goal: ${profile.fitness_goal || "general fitness"}, BMI: ${profile.bmi || "unknown"}, Daily calorie target: ${profile.daily_calories || "unknown"}`
      : "No profile data available. Create a general beginner workout.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional fitness trainer AI. Generate a personalized workout plan based on user profile. You must call the create_workout function.`,
          },
          {
            role: "user",
            content: `Create a workout plan for today. ${profileContext}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_workout",
              description: "Create a structured workout plan",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Workout title, e.g. 'Upper Body Power'" },
                  description: { type: "string", description: "Brief description of the workout goals (1 sentence)" },
                  difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                  duration_minutes: { type: "number", description: "Estimated duration in minutes" },
                  exercises: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        sets: { type: "number" },
                        reps: { type: "string", description: "e.g. '12' or '30 seconds'" },
                        rest_seconds: { type: "number" },
                      },
                      required: ["name", "sets", "reps", "rest_seconds"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "description", "difficulty", "duration_minutes", "exercises"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_workout" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No workout plan returned");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-workout error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
