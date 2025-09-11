import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
}

export const StatsCard = ({ title, value, description, icon, trend = "neutral" }: StatsCardProps) => {
  const trendColors = {
    up: "text-secondary",
    down: "text-destructive", 
    neutral: "text-muted-foreground"
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="p-2 bg-muted/50 rounded-md">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs ${trendColors[trend]} mt-1`}>
          {description}
        </p>
      </CardContent>
    </Card>
  );
};