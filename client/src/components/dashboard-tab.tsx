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
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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
  Home,
  FlameKindling,
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
    Avant: Number((card.before ?? 0).toFixed(2)),
    Après: Number((card.after ?? 0).toFixed(2)),
  }));

  const monthLabels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Août", "Sep", "Oct", "Nov", "Déc"];
  const monthlyComparisonData = monthLabels.map((month, idx) => {
    const preMonth = pre.monthlyEnergy?.[idx];
    const postMonth = post.monthlyEnergy?.[idx];
    const preTotal = preMonth
      ? (preMonth.heatingPrimary + preMonth.heatingSecondary + preMonth.hotWaterPrimary + preMonth.hotWaterSecondary + preMonth.lightingAppliances + preMonth.ventilation + preMonth.cooling) / 1000
      : 0;
    const postTotal = postMonth
      ? (postMonth.heatingPrimary + postMonth.heatingSecondary + postMonth.hotWaterPrimary + postMonth.hotWaterSecondary + postMonth.lightingAppliances + postMonth.ventilation + postMonth.cooling) / 1000
      : 0;
    return { month, Avant: Number(preTotal.toFixed(2)), Après: Number(postTotal.toFixed(2)) };
  });

  const monthlyHeatingData = monthLabels.map((month, idx) => {
    const preMonth = pre.monthlyEnergy?.[idx];
    const postMonth = post.monthlyEnergy?.[idx];
    const preHeating = preMonth ? (preMonth.heatingPrimary + preMonth.heatingSecondary) / 1000 : 0;
    const postHeating = postMonth ? (postMonth.heatingPrimary + postMonth.heatingSecondary) / 1000 : 0;
    return { month, Avant: Number(preHeating.toFixed(2)), Après: Number(postHeating.toFixed(2)) };
  });

  const radarData = summaryCards.map((card) => ({
    category: card.label,
    reduction: card.before > 0 ? Number((((card.before - card.after) / card.before) * 100).toFixed(1)) : 0,
  }));

  const heatLossComparisonData = (() => {
    const elements: { name: string; Avant: number; Après: number }[] = [];
    const preZone1 = pre.zone1 || [];
    const postZone1 = post.zone1 || [];
    const allElements = new Set([...preZone1.map(z => z.element), ...postZone1.map(z => z.element)]);
    allElements.forEach(el => {
      const preEl = preZone1.find(z => z.element === el);
      const postEl = postZone1.find(z => z.element === el);
      elements.push({
        name: el.length > 15 ? el.substring(0, 15) + "…" : el,
        Avant: Number(((preEl?.heatLossMJ ?? 0) / 1000).toFixed(2)),
        Après: Number(((postEl?.heatLossMJ ?? 0) / 1000).toFixed(2)),
      });
    });
    if (pre.ventilation?.heatLossMJ || post.ventilation?.heatLossMJ) {
      elements.push({
        name: "Ventilation",
        Avant: Number(((pre.ventilation?.heatLossMJ ?? 0) / 1000).toFixed(2)),
        Après: Number(((post.ventilation?.heatLossMJ ?? 0) / 1000).toFixed(2)),
      });
    }
    return elements;
  })();

  const gesBarData = [
    { name: "GES Total", Avant: Number((comparison.ghsBefore ?? 0).toFixed(4)), Après: Number((comparison.ghsAfter ?? 0).toFixed(4)) },
  ];
  if ((comparison.ghsElectricityBefore ?? 0) > 0 || (comparison.ghsElectricityAfter ?? 0) > 0) {
    gesBarData.push({ name: "GES Électricité", Avant: Number((comparison.ghsElectricityBefore ?? 0).toFixed(4)), Après: Number((comparison.ghsElectricityAfter ?? 0).toFixed(4)) });
  }
  if ((comparison.ghsGasBefore ?? 0) > 0 || (comparison.ghsGasAfter ?? 0) > 0) {
    gesBarData.push({ name: "GES Combustible", Avant: Number((comparison.ghsGasBefore ?? 0).toFixed(4)), Après: Number((comparison.ghsGasAfter ?? 0).toFixed(4)) });
  }

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
              {(comparison.totalBefore ?? 0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">GJ/an</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-chart-4" />
              <p className="text-xs text-muted-foreground">Total APRÈS</p>
            </div>
            <p className="text-2xl font-semibold tabular-nums" data-testid="text-total-after">
              {(comparison.totalAfter ?? 0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">GJ/an</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-chart-4" />
              <p className="text-xs text-muted-foreground">Amélioration</p>
            </div>
            <p className="text-2xl font-semibold tabular-nums" data-testid="text-improvement">
              {(comparison.improvementPercent ?? 0).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Réduction énergie</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4 text-chart-4" />
              <p className="text-xs text-muted-foreground">GES Réduction</p>
            </div>
            <p className="text-2xl font-semibold tabular-nums" data-testid="text-ghs-improvement">
              {(comparison.ghsImprovementPercent ?? 0).toFixed(1)}%
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
                    <span className="text-xs text-muted-foreground">Après</span>
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
          <h3 className="font-medium mb-4">Comparatif énergétique (GJ/an)</h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Avant" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Après" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-medium mb-4">Profil énergétique mensuel (GJ/mois)</h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Avant" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="Après" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4">Chauffage mensuel (GJ/mois)</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyHeatingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Avant" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Après" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4">Réduction par catégorie (%)</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
                  <Radar dataKey="reduction" stroke="hsl(var(--chart-4))" fill="hsl(var(--chart-4))" fillOpacity={0.3} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} formatter={(value: number) => [`${value}%`, "Réduction"]} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {heatLossComparisonData.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4">Pertes thermiques par composante (GJ/an)</h3>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatLossComparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Avant" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Après" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4">Répartition AVANT travaux</h3>
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
            <h3 className="font-medium mb-4">Répartition APRÈS travaux</h3>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4">GES - Gaz à effet de serre (T CO2/an)</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gesBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Avant" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Après" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4">Résumé GES</h3>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-chart-1" />
                  <span className="text-sm">GES Avant</span>
                </div>
                <span className="text-lg font-semibold font-mono" data-testid="text-ges-before">{(comparison.ghsBefore ?? 0).toFixed(4)} T</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                <div className="flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-chart-4" />
                  <span className="text-sm">GES Après</span>
                </div>
                <span className="text-lg font-semibold font-mono" data-testid="text-ges-after">{(comparison.ghsAfter ?? 0).toFixed(4)} T</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md border-2 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Réduction GES</span>
                </div>
                <Badge variant="default" className="text-base px-3 py-1" data-testid="text-ges-reduction">{(comparison.ghsImprovementPercent ?? 0).toFixed(1)}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
