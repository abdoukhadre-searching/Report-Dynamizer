import type { Project, ReportData, ComparisonData, MonthlyEnergy } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingDown,
  Thermometer,
  Droplets,
  Zap,
  Wind,
  Snowflake,
  Gauge,
  Leaf,
} from "lucide-react";

interface DashboardTabProps {
  project: Project;
}

export default function DashboardTab({ project }: DashboardTabProps) {
  const pre = project.preReportData as ReportData | null;
  const post = project.postReportData as ReportData | null;
  const comparison = project.comparisonData as ComparisonData | null;

  if (!pre || !post || !comparison) return null;

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  const summaryCards = [
    {
      label: "Chauffage",
      before: comparison.heatingBefore,
      after: comparison.heatingAfter,
      unit: "GJ",
      icon: Thermometer,
      color: "text-chart-1",
    },
    {
      label: "Eau chaude",
      before: comparison.hotWaterBefore,
      after: comparison.hotWaterAfter,
      unit: "GJ",
      icon: Droplets,
      color: "text-chart-2",
    },
    {
      label: "Charges de base",
      before: comparison.baseLoadsBefore,
      after: comparison.baseLoadsAfter,
      unit: "GJ",
      icon: Zap,
      color: "text-chart-3",
    },
    {
      label: "Ventilation",
      before: comparison.ventilationBefore,
      after: comparison.ventilationAfter,
      unit: "GJ",
      icon: Wind,
      color: "text-chart-4",
    },
    {
      label: "Climatisation",
      before: comparison.coolingBefore,
      after: comparison.coolingAfter,
      unit: "GJ",
      icon: Snowflake,
      color: "text-chart-5",
    },
  ];

  const barChartData = summaryCards.map((card) => ({
    name: card.label,
    Avant: Number(card.before.toFixed(2)),
    Apres: Number(card.after.toFixed(2)),
  }));

  const pieDataBefore = summaryCards.map((card) => ({
    name: card.label,
    value: Number(card.before.toFixed(2)),
  }));

  const pieDataAfter = summaryCards.map((card) => ({
    name: card.label,
    value: Number(card.after.toFixed(2)),
  }));

  const buildingZones = (data: ReportData, label: string) => {
    if (!data.zone1?.length) return null;
    return (
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{label}</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Element</TableHead>
              <TableHead className="text-xs text-right">Sup. brute (m2)</TableHead>
              <TableHead className="text-xs text-right">RSI</TableHead>
              <TableHead className="text-xs text-right">Perte (MJ)</TableHead>
              <TableHead className="text-xs text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.zone1.map((z, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs">{z.element}</TableCell>
                <TableCell className="text-xs text-right">{z.grossArea?.toFixed(2) ?? "-"}</TableCell>
                <TableCell className="text-xs text-right">{z.rsi?.toFixed(2) ?? "-"}</TableCell>
                <TableCell className="text-xs text-right font-mono">{z.heatLossMJ.toFixed(2)}</TableCell>
                <TableCell className="text-xs text-right">{z.heatLossPercent.toFixed(2)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-chart-1" />
              <p className="text-xs text-muted-foreground">Total AVANT</p>
            </div>
            <p className="text-2xl font-semibold tabular-nums" data-testid="text-total-before">
              {comparison.totalBefore.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">GJ/an</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-chart-4" />
              <p className="text-xs text-muted-foreground">Total APRES</p>
            </div>
            <p className="text-2xl font-semibold tabular-nums" data-testid="text-total-after">
              {comparison.totalAfter.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">GJ/an</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-chart-4" />
              <p className="text-xs text-muted-foreground">Amelioration</p>
            </div>
            <p className="text-2xl font-semibold tabular-nums" data-testid="text-improvement">
              {comparison.improvementPercent.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Reduction energie</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4 text-chart-4" />
              <p className="text-xs text-muted-foreground">GES Reduction</p>
            </div>
            <p className="text-2xl font-semibold tabular-nums" data-testid="text-ghs-improvement">
              {comparison.ghsImprovementPercent.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">T/an CO2</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {summaryCards.map((card) => {
          const reduction = card.before > 0
            ? (((card.before - card.after) / card.before) * 100).toFixed(1)
            : "0.0";
          return (
            <Card key={card.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                  <span className="text-xs font-medium">{card.label}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Avant</span>
                    <span className="text-sm font-mono">{card.before.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Apres</span>
                    <span className="text-sm font-mono">{card.after.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <Badge variant="secondary" className="text-xs">
                      {reduction}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium mb-4">Comparatif energetique (GJ/an)</h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Avant" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Apres" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4">Repartition AVANT travaux</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataBefore}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={10}
                  >
                    {pieDataBefore.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4">Repartition APRES travaux</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataAfter}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={10}
                  >
                    {pieDataAfter.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4">Pertes thermiques - PRE</h3>
            {buildingZones(pre, "Zone 1 - Au-dessus du niveau du sol")}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4">Pertes thermiques - POST</h3>
            {buildingZones(post, "Zone 1 - Au-dessus du niveau du sol")}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium mb-4">GES (Gaz a effet de serre)</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Indicateur</TableHead>
                <TableHead className="text-xs text-right">Avant (T/A)</TableHead>
                <TableHead className="text-xs text-right">Apres (T/A)</TableHead>
                <TableHead className="text-xs text-right">Reduction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="text-xs">GES Electricite</TableCell>
                <TableCell className="text-xs text-right font-mono">{comparison.ghsBefore.toFixed(3)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{comparison.ghsAfter.toFixed(3)}</TableCell>
                <TableCell className="text-xs text-right">
                  <Badge variant="secondary">{comparison.ghsImprovementPercent.toFixed(1)}%</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
