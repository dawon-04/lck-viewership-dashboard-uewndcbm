// @ts-nocheck

import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Cell,
  LabelList,
} from "recharts";
import Papa from "papaparse";

// ============================================================
// Google Sheets
// ============================================================
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSSMiO-mr7gpLXGsPtZdsBIRjvFyTRzs2WSqnISb0gxSleiZJUY6Qgi1wumo9p9tN3ljmYKlyrwf4iS/pub?gid=1973859034&single=true&output=csv";

// ============================================================
// 타입
// ============================================================
type DashboardRow = {
  Team_Full: string;
  Avg_Viewers: string;
  Peak_Viewers_sub: string;
  Source: string;
  Date: string;
  Tournament: string;
  Language: string;
  Platform: string;
  Year: string;
  Stage: string;
  Split: string;
  [key: string]: string;
};

// ============================================================
// Helpers
// ============================================================
const toNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return 0;

  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const avg = (values: number[]) => {
  if (!values.length) return 0;

  return (
    values.reduce((a, b) => a + b, 0) /
    values.length
  );
};

const fmt = (n) =>
  typeof n === "number"
    ? Math.round(n).toLocaleString("ko-KR")
    : n;

const isGenG = (team) => team === "Gen.G";

// ============================================================
// 공식 Stage 순서
// ============================================================

const STAGE_ORDER = [
  "LCK Cup",
  "Split 1",
  "First Stand",
  "Split 2 — Regular Season",
  "Split 2 — Road to MSI",
  "MSI",
  "Split 3",
  "Worlds",
];

// ============================================================
// Team Summary
// ============================================================
const getTeamSummary = (rows: DashboardRow[]) => {
  const teams = [
    ...new Set(
      rows
        .map((r) => String(r.Team_Full || "").trim())
        .filter(Boolean)
    ),
  ];

  const result = teams.map((team) => {
    const teamRows = rows.filter(
      (r) =>
        String(r.Team_Full || "").trim() === team
    );

    const avgViewers = avg(
      teamRows.map((r) =>
        toNumber(r.Avg_Viewers)
      )
    );

    const peakValues = teamRows.map((r) =>
      toNumber(r.Peak_Viewers_sub)
    );

    return {
      team,
      avg: Math.round(avgViewers),
      peak:
        peakValues.length
          ? Math.max(...peakValues)
          : 0,
      n: teamRows.length,
    };
  });

  result.sort((a, b) => b.avg - a.avg);

  const leagueAvg = avg(
    result.map((t) => t.avg)
  );

  return result.map((t, index) => ({
    ...t,
    rank: index + 1,
    vsLeague:
      leagueAvg > 0
        ? Number(
            (
              ((t.avg / leagueAvg) - 1) *
              100
            ).toFixed(1)
          )
        : 0,
  }));
};

// ============================================================
// Colors
// ============================================================
const GOLD = "#D4AF37";
const SLATE = "#5B6478";
const SLATE_LIGHT = "#8890A3";
const RED = "#E1574B";
const GREEN = "#4FBF77";
const BG = "#0F1016";
const PANEL = "#171826";
const BORDER = "#2A2C3D";
const TEXT_DIM = "#9098AC";

// ============================================================
// Section Label
// ============================================================
function SectionLabel({ index, title }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        marginBottom: 18,
      }}
    >
      <span
        style={{
          fontFamily:
            "ui-monospace, monospace",
          fontSize: 12,
          color: TEXT_DIM,
          letterSpacing: 1,
        }}
      >
        {index}
      </span>

      <h2
        style={{
          fontSize: 19,
          fontWeight: 700,
          color: "#F2F3F7",
          margin: 0,
        }}
      >
        {title}
      </h2>

      <div
        style={{
          flex: 1,
          height: 1,
          background: BORDER,
        }}
      />
    </div>
  );
}

// ============================================================
// Stat Block
// ============================================================
function StatBlock({
  label,
  value,
  sub,
  accent,
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 150,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: TEXT_DIM,
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          color:
            accent || "#F2F3F7",
          fontFamily:
            "ui-monospace, monospace",
          letterSpacing: -1,
        }}
      >
        {value}
      </div>

      {sub && (
        <div
          style={{
            fontSize: 12.5,
            color: TEXT_DIM,
            marginTop: 4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Tooltip
// ============================================================
function CustomTooltip({
  active,
  payload,
  label,
  unit,
}) {
  if (
    !active ||
    !payload ||
    !payload.length
  ) {
    return null;
  }

  return (
    <div
      style={{
        background: "#1D1E2E",
        border: `1px solid ${BORDER}`,
        borderRadius: 4,
        padding: "8px 12px",
        fontSize: 12.5,
      }}
    >
      <div
        style={{
          color: "#F2F3F7",
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      {payload.map((p, i) => (
        <div
          key={i}
          style={{
            color:
              p.color || TEXT_DIM,
          }}
        >
          {p.name}:{" "}
          {fmt(toNumber(p.value))}
          {unit || "명"}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Filter Select
// ============================================================
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div
      style={{
        minWidth: 150,
        flex: "1 1 150px",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: TEXT_DIM,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 1,
          fontFamily:
            "ui-monospace, monospace",
        }}
      >
        {label}
      </div>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        style={{
          width: "100%",
          background: "#10111A",
          color: "#E5E7F0",
          border: `1px solid ${BORDER}`,
          borderRadius: 5,
          padding: "9px 10px",
          fontSize: 12.5,
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================
// Main
// ============================================================
export default function GenGDashboard() {
  const [data, setData] =
    useState<DashboardRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ==========================================================
  // FILTER STATE
  // ==========================================================
  const [selectedYear, setSelectedYear] =
    useState("All");

  const [selectedStage, setSelectedStage] =
    useState("All");

  const [selectedTeam, setSelectedTeam] =
    useState("Gen.G");

  const [selectedPlatform, setSelectedPlatform] =
    useState("All");

  // ==========================================================
  // Load Google Sheets
  // ==========================================================
  useEffect(() => {
    Papa.parse<DashboardRow>(
      SHEET_URL,
      {
        download: true,
        header: true,
        skipEmptyLines: true,

        transformHeader: (header) =>
          String(header)
            .replace(/^\uFEFF/, "")
            .trim(),

        complete: (results) => {
          console.log(
            "Google Sheets 데이터:",
            results.data
          );

          console.log(
            "총 데이터 행:",
            results.data.length
          );

          if (!results.data.length) {
            setError(
              "Google Sheets에 데이터가 없습니다."
            );

            setLoading(false);
            return;
          }

          setData(results.data);
          setLoading(false);
        },

        error: (err) => {
          console.error(
            "Google Sheets 불러오기 실패:",
            err
          );

          setError(
            "Google Sheets 데이터를 불러오지 못했습니다."
          );

          setLoading(false);
        },
      }
    );
  }, []);

  // ==========================================================
  // FILTER OPTIONS
  // ==========================================================
  const filterOptions =
    useMemo(() => {
      const years = [
        ...new Set(
          data
            .map((r) =>
              String(
                r.Year || ""
              ).trim()
            )
            .filter(Boolean)
        ),
      ].sort();

      const teams = [
        ...new Set(
          data
            .map((r) =>
              String(
                r.Team_Full || ""
              ).trim()
            )
            .filter(Boolean)
        ),
      ].sort();

      const platforms = [
        ...new Set(
          data
            .map((r) =>
              String(
                r.Platform || ""
              ).trim()
            )
            .filter(Boolean)
        ),
      ].sort();

      return {
        years: [
          "All",
          ...years,
        ],

        teams: [
          "All",
          ...teams,
        ],

        platforms: [
          "All",
          ...platforms,
        ],
      };
    }, [data]);

  // ==========================================================
  // Stage options
  // ==========================================================
  const stageOptions =
    useMemo(() => {
      const stagesInData = [
        ...new Set(
          data
            .map((r) =>
              String(
                r.Stage || ""
              ).trim()
            )
            .filter(Boolean)
        ),
      ];

      const orderedStages =
        STAGE_ORDER.filter((stage) =>
          stagesInData.includes(stage)
        );

      const otherStages =
        stagesInData.filter(
          (stage) =>
            !STAGE_ORDER.includes(stage)
        );

      return [
        "All",
        ...orderedStages,
        ...otherStages,
      ];
    }, [data]);

  // ==========================================================
  // Stage Matching
  // ==========================================================
  const matchesStage = (
    row,
    stage
  ) => {
    if (stage === "All") {
      return true;
    }

    return (
      String(
        row.Stage || ""
      ).trim() === stage
    );
  };

  // ==========================================================
  // FILTERED DATA
  // ==========================================================
  const filteredData =
    useMemo(() => {
      return data.filter((r) => {
        const yearMatch =
          selectedYear === "All" ||
          String(
            r.Year || ""
          ).trim() ===
            selectedYear;

        const stageMatch =
          matchesStage(
            r,
            selectedStage
          );

        const teamMatch =
          selectedTeam === "All" ||
          String(
            r.Team_Full || ""
          ).trim() ===
            selectedTeam;

        const platformMatch =
          selectedPlatform === "All" ||
          String(
            r.Platform || ""
          ).trim() ===
            selectedPlatform;

        return (
          yearMatch &&
          stageMatch &&
          teamMatch &&
          platformMatch
        );
      });
    }, [
      data,
      selectedYear,
      selectedStage,
      selectedTeam,
      selectedPlatform,
    ]);

  // ==========================================================
  // Reset
  // ==========================================================
  const resetFilters = () => {
    setSelectedYear("All");
    setSelectedStage("All");
    setSelectedTeam("All");
    setSelectedPlatform("All");
  };

// ==========================================================
// TEAM RANKING DATA
// Team 필터는 제외하고 Year / Stage / Platform만 적용
// ==========================================================
const rankingData =
  useMemo(() => {
    return data.filter((r) => {
      const yearMatch =
        selectedYear === "All" ||
        String(
          r.Year || ""
        ).trim() ===
          selectedYear;

      const stageMatch =
        matchesStage(
          r,
          selectedStage
        );

      const platformMatch =
        selectedPlatform === "All" ||
        String(
          r.Platform || ""
        ).trim() ===
          selectedPlatform;

      return (
        yearMatch &&
        stageMatch &&
        platformMatch
      );
    });
  }, [
    data,
    selectedYear,
    selectedStage,
    selectedPlatform,
  ]);

// ==========================================================
// TEAM SUMMARY
// 선택한 Team과 상관없이 전체 구단의 순위를 계산
// ==========================================================
const TEAM_SUMMARY =
  useMemo(() => {
    return getTeamSummary(
      rankingData
    );
  }, [rankingData]);

  // ==========================================================
  // KPI DATA
  // ==========================================================
  const selectedTeamData =
    useMemo(() => {
      if (
        selectedTeam === "All"
      ) {
        const avgViewers =
          avg(
            filteredData.map(
              (r) =>
                toNumber(
                  r.Avg_Viewers
                )
            )
          );

        const peakValues =
          filteredData.map(
            (r) =>
              toNumber(
                r.Peak_Viewers_sub
              )
          );

        const peak =
          peakValues.length
            ? Math.max(
                ...peakValues
              )
            : 0;

        return {
          team: "All Teams",
          avg: Math.round(
            avgViewers
          ),
          peak,
          n: filteredData.length,
          rank: 0,
          vsLeague: 0,
        };
      }

      return (
        TEAM_SUMMARY.find(
          (t) =>
            t.team ===
            selectedTeam
        ) || {
          team: selectedTeam,
          avg: 0,
          peak: 0,
          n: 0,
          rank: 0,
          vsLeague: 0,
        }
      );
    }, [
      TEAM_SUMMARY,
      selectedTeam,
      filteredData,
    ]);

  // ==========================================================
  // CUP COMPARISON
  // 2025 LCK Cup vs 2026 Split 1
  // Team 필터는 제외
  // Year / Stage 필터도 무시
  // Platform만 적용
  // ==========================================================
  const CUP_COMPARE = useMemo(() => {
    const getCupData = (
      year: string,
      stage: string
    ) => {
      return data.filter((r) => {
        const platformMatch =
          selectedPlatform === "All" ||
          String(
            r.Platform || ""
          ).trim() ===
            selectedPlatform;

        return (
          String(
            r.Year || ""
          ).trim() === year &&
          String(
            r.Stage || ""
          ).trim() === stage &&
          platformMatch
        );
      });
    };

    const cup2025 =
      getCupData(
        "2025",
        "LCK Cup"
      );

    const cup2026 =
      getCupData(
        "2026",
        "Split 1"
      );

    // 두 대회에 등장하는 모든 팀
    const teams = Array.from(
      new Set(
        [...cup2025, ...cup2026]
          .map((r) =>
            String(
              r.Team_Full || ""
            ).trim()
          )
          .filter(Boolean)
      )
    );

    return teams
      .map((team) => {
        const data2025 =
          cup2025.filter(
            (r) =>
              String(
                r.Team_Full || ""
              ).trim() === team
          );

        const data2026 =
          cup2026.filter(
            (r) =>
              String(
                r.Team_Full || ""
              ).trim() === team
          );

        const avg2025 =
          data2025.length > 0
            ? Math.round(
                avg(
                  data2025.map(
                    (r) =>
                      toNumber(
                        r.Avg_Viewers
                      )
                  )
                )
              )
            : 0;

        const avg2026 =
          data2026.length > 0
            ? Math.round(
                avg(
                  data2026.map(
                    (r) =>
                      toNumber(
                        r.Avg_Viewers
                      )
                  )
                )
              )
            : 0;

        const yoy =
          avg2025 > 0
            ? Number(
                (
                  ((avg2026 /
                    avg2025) -
                    1) *
                  100
                ).toFixed(1)
              )
            : 0;

        return {
          team,
          y2025: avg2025,
          y2026: avg2026,
          yoy,
        };
      })
      .sort(
        (a, b) =>
          b.y2026 - a.y2026
      );
  }, [
    data,
    selectedPlatform,
  ]);

  // ==========================================================
  // SELECTED TEAM CUP
  // ==========================================================
  const selectedCup =
    useMemo(() => {
      if (
        selectedTeam === "All"
      ) {
        const cupRows2025 =
          data.filter((r) => {
            return (
              Number(r.Year) ===
                2025 &&
              String(
                r.Stage || ""
              ).trim() ===
                "LCK Cup" &&
              (
                selectedPlatform ===
                  "All" ||
                String(
                  r.Platform || ""
                ).trim() ===
                  selectedPlatform
              )
            );
          });

        const cupRows2026 =
          data.filter((r) => {
            return (
              Number(r.Year) ===
                2026 &&
              String(
                r.Stage || ""
              ).trim() ===
                "Split 1" &&
              (
                selectedPlatform ===
                  "All" ||
                String(
                  r.Platform || ""
                ).trim() ===
                  selectedPlatform
              )
            );
          });

        const y2025 =
          Math.round(
            avg(
              cupRows2025.map(
                (r) =>
                  toNumber(
                    r.Avg_Viewers
                  )
              )
            )
          );

        const y2026 =
          Math.round(
            avg(
              cupRows2026.map(
                (r) =>
                  toNumber(
                    r.Avg_Viewers
                  )
              )
            )
          );

        return {
          y2025,
          y2026,
          yoy:
            y2025 > 0
              ? Number(
                  (
                    ((y2026 /
                      y2025) -
                      1) *
                    100
                  ).toFixed(1)
                )
              : 0,
        };
      }

      const row =
        CUP_COMPARE.find(
          (r) =>
            r.team ===
            selectedTeam
        );

      if (!row) {
        return {
          y2025: 0,
          y2026: 0,
          yoy: 0,
        };
      }

      return {
        y2025: row.y2025,
        y2026: row.y2026,
        yoy: row.yoy,
      };
    }, [
      CUP_COMPARE,
      selectedTeam,
      data,
      selectedPlatform,
    ]);

  // ==========================================================
  // CUP RANK
  // 선택한 팀이 전체 팀 중 몇 위인지 계산
  // ==========================================================
  const selectedCupRank =
    useMemo(() => {
      if (selectedTeam === "All") {
        return {
          y2025: 0,
          y2026: 0,
        };
      }

      const rankForYear = (key) => {
        const sorted = [...CUP_COMPARE]
          .filter((r) => r[key] != null)
          .sort((a, b) => b[key] - a[key]);

        const index = sorted.findIndex(
          (r) => r.team === selectedTeam
        );

        return index >= 0 ? index + 1 : 0;
      };

      return {
        y2025: rankForYear("y2025"),
        y2026: rankForYear("y2026"),
      };
    }, [CUP_COMPARE, selectedTeam]);

  // ==========================================================
  // STAGE PERFORMANCE
  // ==========================================================
  const stageRow =
    useMemo(() => {
      const baseRows =
        data.filter((r) => {
          const yearMatch =
            selectedYear ===
              "All" ||
            String(
              r.Year || ""
            ).trim() ===
              selectedYear;

          const platformMatch =
            selectedPlatform ===
              "All" ||
            String(
              r.Platform || ""
            ).trim() ===
              selectedPlatform;

          const teamMatch =
            selectedTeam ===
              "All" ||
            String(
              r.Team_Full || ""
            ).trim() ===
              selectedTeam;

          return (
            yearMatch &&
            platformMatch &&
            teamMatch
          );
        });

      const getStageAvg =
        (stage) => {
          const rows =
            baseRows.filter(
              (r) =>
                String(
                  r.Stage || ""
                ).trim() ===
                stage
            );

          if (!rows.length) {
            return null;
          }

          return Math.round(
            avg(
              rows.map(
                (r) =>
                  toNumber(
                    r.Avg_Viewers
                  )
              )
            )
          );
        };

      const result = {
        team:
          selectedTeam ===
          "All"
            ? "All Teams"
            : selectedTeam,

        "LCK Cup":
          getStageAvg(
            "LCK Cup"
          ),

        "Split 1":
          getStageAvg(
            "Split 1"
          ),

        "Split 2 — Regular Season":
          getStageAvg(
            "Split 2 — Regular Season"
          ),

        "Split 2 — Road to MSI":
          getStageAvg(
            "Split 2 — Road to MSI"
          ),

        "First Stand":
          getStageAvg(
            "First Stand"
          ),

        MSI:
          getStageAvg("MSI"),

        "Split 3":
          getStageAvg("Split 3"),

        Worlds:
          getStageAvg(
            "Worlds"
          ),
      };

      return result;
    }, [
      data,
      selectedTeam,
      selectedYear,
      selectedPlatform,
    ]);

// ==========================================================
// STAGE CHART DATA
// ==========================================================
  const stageChartData = useMemo(() => {
    return STAGE_ORDER
      .map((stage) => ({
        stage,
        value: stageRow[stage],
      }))
      .filter((d) => d.value != null);
  }, [stageRow]);

// ==========================================================
// YEARLY TREND
// 2025 LCK Cup vs 2026 Split 1
// Year / Stage 필터는 무시하고 항상 동일한 시즌 초반 단계 비교
// Team / Platform 필터만 적용
// ==========================================================
  const YEARLY_TREND = useMemo(() => {
    const trendData = [
      {
        year: "2025",
        stage: "LCK Cup",
        value: avg(
          data
            .filter((r) => {
              const teamMatch =
                selectedTeam === "All" ||
                String(r.Team_Full || "").trim() === selectedTeam;

              const platformMatch =
                selectedPlatform === "All" ||
                String(r.Platform || "").trim() === selectedPlatform;

              return (
                teamMatch &&
                platformMatch &&
                String(r.Year || "").trim() === "2025" &&
                String(r.Stage || "").trim() === "LCK Cup"
              );
            })
            .map((r) => toNumber(r.Avg_Viewers))
        ),
      },
      {
        year: "2026",
        stage: "Split 1",
        value: avg(
          data
            .filter((r) => {
              const teamMatch =
                selectedTeam === "All" ||
                String(r.Team_Full || "").trim() === selectedTeam;

              const platformMatch =
                selectedPlatform === "All" ||
                String(r.Platform || "").trim() === selectedPlatform;

              return (
                teamMatch &&
                platformMatch &&
                String(r.Year || "").trim() === "2026" &&
                String(r.Stage || "").trim() === "Split 1"
              );
            })
            .map((r) => toNumber(r.Avg_Viewers))
        ),
      },
    ];

    return trendData.filter((d) => d.value != null);
  }, [data, selectedTeam, selectedPlatform]);

  // ==========================================================
  // TOP 5
  // ==========================================================
  const TOP5 =
    useMemo(() => {
      const rows =
        filteredData;

      const grouped = {};

      rows.forEach((r) => {
        const date =
          r.Date || "Unknown";

        if (!grouped[date]) {
          grouped[date] = [];
        }

        grouped[date].push(r);
      });

      const matches =
        Object.entries(
          grouped
        ).map(
          ([date, rows]) => {
            const peak =
              Math.max(
                ...rows.map(
                  (r) =>
                    toNumber(
                      r.Peak_Viewers_sub
                    )
                )
              );

            const average =
              Math.round(
                avg(
                  rows.map(
                    (r) =>
                      toNumber(
                        r.Avg_Viewers
                      )
                  )
                )
              );

            return {
              date,
              tag:
                rows[0]?.Stage ||
                rows[0]?.Tournament ||
                "Event",
              peak,
              avg: average,
            };
          }
        );

      return matches
        .sort(
          (a, b) =>
            b.peak - a.peak
        )
        .slice(0, 5);
    }, [filteredData]);

  // ==========================================================
  // PLATFORM
  // ==========================================================
  const PLATFORM_DATA =
    useMemo(() => {
      const baseRows =
        data.filter((r) => {
          const teamMatch =
            selectedTeam ===
              "All" ||
            String(
              r.Team_Full || ""
            ).trim() ===
              selectedTeam;

          const yearMatch =
            selectedYear ===
              "All" ||
            String(
              r.Year || ""
            ).trim() ===
              selectedYear;

          const stageMatch =
            selectedStage ===
              "All" ||
            String(
              r.Stage || ""
            ).trim() ===
              selectedStage;

          return (
            teamMatch &&
            yearMatch &&
            stageMatch
          );
        });

      const platforms = [
        ...new Set(
          baseRows
            .map((r) =>
              String(
                r.Platform || ""
              ).trim()
            )
            .filter(Boolean)
        ),
      ];

      return platforms
        .map((platform) => {
          const rows =
            baseRows.filter(
              (r) =>
                String(
                  r.Platform || ""
                ).trim() ===
                platform
            );

          return {
            platform,
            avg: Math.round(
              avg(
                rows.map(
                  (r) =>
                    toNumber(
                      r.Avg_Viewers
                    )
                )
              )
            ),
            n: rows.length,
          };
        })
        .sort(
          (a, b) =>
            b.avg - a.avg
        );
    }, [
      data,
      selectedTeam,
      selectedYear,
      selectedStage,
    ]);

  // ==========================================================
  // Loading
  // ==========================================================
  if (loading) {
    return (
      <div
        style={{
          background: BG,
          minHeight: "100vh",
          color: "#E5E7F0",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        Google Sheets 데이터를
        불러오는 중...
      </div>
    );
  }

  // ==========================================================
  // Error
  // ==========================================================
  if (error) {
    return (
      <div
        style={{
          background: BG,
          minHeight: "100vh",
          color: RED,
          padding: 40,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {error}
      </div>
    );
  }

  // ==========================================================
  // Dashboard
  // ==========================================================
  return (
    <div
      style={{
        background: BG,
        minHeight: "100vh",
        color: "#E5E7F0",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding:
          "28px 24px 60px",
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
        }}
      >
        {/* ==================================================
            HEADER
        ================================================== */}
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "flex-end",
            marginBottom: 18,
            gap: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: GOLD,
                letterSpacing: 2,
                fontWeight: 700,
                marginBottom: 6,
                fontFamily:
                  "ui-monospace, monospace",
              }}
            >
              LCK VIEWERSHIP
            </div>

            <h1
              style={{
                fontSize: 30,
                fontWeight: 800,
                margin: 0,
                letterSpacing: -0.5,
                color: "#FAFAFC",
              }}
            >
              구단별 시청자 데이터
              대시보드
            </h1>
          </div>

          <div
            style={{
              fontSize: 12,
              color: TEXT_DIM,
              textAlign: "right",
              lineHeight: 1.7,
            }}
          >
            Interactive Dashboard
            <br />
            Google Sheets Live Data
          </div>
        </div>

        {/* ==================================================
            FILTER BAR
        ================================================== */}
        <div
          style={{
            background: PANEL,
            border:
              `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: 16,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#E5E7F0",
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              FILTERS
            </div>

            <button
              onClick={
                resetFilters
              }
              style={{
                background:
                  "transparent",
                border:
                  `1px solid ${BORDER}`,
                color: TEXT_DIM,
                borderRadius: 4,
                padding:
                  "5px 10px",
                fontSize: 11,
                cursor:
                  "pointer",
              }}
            >
              Reset filters
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <FilterSelect
              label="Year"
              value={
                selectedYear
              }
              options={
                filterOptions.years
              }
              onChange={
                setSelectedYear
              }
            />

            <FilterSelect
              label="Stage"
              value={
                selectedStage
              }
              options={
                stageOptions
              }
              onChange={
                setSelectedStage
              }
            />

            <FilterSelect
              label="Team"
              value={
                selectedTeam
              }
              options={
                filterOptions.teams
              }
              onChange={
                setSelectedTeam
              }
            />

            <FilterSelect
              label="Platform"
              value={
                selectedPlatform
              }
              options={
                filterOptions.platforms
              }
              onChange={
                setSelectedPlatform
              }
            />
          </div>

          <div
            style={{
              marginTop: 12,
              paddingTop: 11,
              borderTop:
                `1px solid ${BORDER}`,
              fontSize: 11.5,
              color: TEXT_DIM,
            }}
          >
            Showing:
            {" "}
            <span
              style={{
                color:
                  "#E5E7F0",
              }}
            >
              {selectedYear ===
              "All"
                ? "All Years"
                : selectedYear}
            </span>
            {" · "}
            <span
              style={{
                color:
                  "#E5E7F0",
              }}
            >
              {selectedStage}
            </span>
            {" · "}
            <span
              style={{
                color:
                  "#E5E7F0",
              }}
            >
              {selectedTeam}
            </span>
            {" · "}
            <span
              style={{
                color:
                  "#E5E7F0",
              }}
            >
              {selectedPlatform}
            </span>
          </div>
        </div>

        {/* ==================================================
            TEAM SCOREBOARD
        ================================================== */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            padding:
              "0 0 22px",
            borderBottom:
              `1px solid ${BORDER}`,
            marginBottom: 28,
          }}
        >
          {TEAM_SUMMARY.map(
            (t) => {
              const active =
                t.team ===
                selectedTeam;

              const gold =
                isGenG(t.team);

              return (
                <button
                  key={t.team}
                  onClick={() =>
                    setSelectedTeam(
                      t.team
                    )
                  }
                  style={{
                    flex:
                      "0 0 auto",
                    cursor:
                      "pointer",
                    textAlign:
                      "left",
                    background:
                      active
                        ? gold
                          ? "rgba(212,175,55,0.14)"
                          : "rgba(255,255,255,0.06)"
                        : "transparent",
                    border:
                      `1px solid ${
                        active
                          ? gold
                            ? GOLD
                            : "#4A4D63"
                          : BORDER
                      }`,
                    borderRadius: 6,
                    padding:
                      "8px 12px",
                    minWidth: 108,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: gold
                        ? GOLD
                        : TEXT_DIM,
                      fontFamily:
                        "ui-monospace, monospace",
                    }}
                  >
                    #{t.rank}
                  </div>

                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: gold
                        ? GOLD
                        : "#E5E7F0",
                      whiteSpace:
                        "nowrap",
                      marginTop: 2,
                    }}
                  >
                    {t.team}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: TEXT_DIM,
                      marginTop: 2,
                      fontFamily:
                        "ui-monospace, monospace",
                    }}
                  >
                    {fmt(t.avg)}
                  </div>
                </button>
              );
            }
          )}
        </div>

        {/* ==================================================
            HERO / KPI
        ================================================== */}
        <div
          style={{
            display: "flex",
            gap: 32,
            flexWrap: "wrap",
            marginBottom: 40,
            background: PANEL,
            border:
              `1px solid ${BORDER}`,
            borderRadius: 8,
            padding:
              "24px 28px",
          }}
        >
          <StatBlock
            label={
              selectedTeam ===
              "All"
                ? "전체 구단"
                : `${selectedTeam} 순위`
            }
            value={
              selectedTeam ===
              "All"
                ? "—"
                : selectedTeamData.rank
                ? `${selectedTeamData.rank} / ${TEAM_SUMMARY.length}`
                : "-"
            }
            sub="현재 필터 기준"
            accent={
              isGenG(
                selectedTeamData.team
              )
                ? GOLD
                : "#F2F3F7"
            }
          />

          <StatBlock
            label="평균 동시시청자"
            value={
              selectedTeamData.avg >
              0
                ? fmt(
                    selectedTeamData.avg
                  )
                : "-"
            }
            sub="현재 필터 기준"
            accent={
              isGenG(
                selectedTeamData.team
              )
                ? GOLD
                : "#F2F3F7"
            }
          />

          <StatBlock
            label="최고 동시시청자"
            value={
              selectedTeamData.peak >
              0
                ? fmt(
                    selectedTeamData.peak
                  )
                : "-"
            }
            sub="현재 필터 기준"
            accent={
              isGenG(
                selectedTeamData.team
              )
                ? GOLD
                : "#F2F3F7"
            }
          />

          <StatBlock
            label="리그평균 대비"
            value={
              selectedTeam ===
              "All"
                ? "0.0%"
                : selectedTeamData.rank
                ? `${
                    selectedTeamData.vsLeague >
                    0
                      ? "+"
                      : ""
                  }${selectedTeamData.vsLeague}%`
                : "-"
            }
            sub={
              selectedTeam ===
              "All"
                ? "전체 구단 평균 기준"
                : "현재 필터 기준"
            }
            accent={
              selectedTeam ===
              "All"
                ? GREEN
                : selectedTeamData.vsLeague >=
                  0
                ? GREEN
                : RED
            }
          />
        </div>

        {/* ==================================================
            01 CUP
        ================================================== */}
        <SectionLabel
          index="01"
          title="CUP 동일기간 비교"
        />

        <p
          style={{
            color: TEXT_DIM,
            fontSize: 13.5,
            lineHeight: 1.7,
            marginTop: -8,
            marginBottom: 18,
          }}
        >
          2025년 LCK Cup과 2026년 Split 1의{" "}
          <strong
            style={{
              color: "#E5E7F0",
            }}
          >
            평균 동시시청자
          </strong>
          를 비교합니다.
          {" "}
          {selectedTeam === "All" ? (
            <>
              전체 구단 기준 2025년 평균은{" "}
              <strong
                style={{
                  color: GOLD,
                }}
              >
                {selectedCup.y2025
                  ? fmt(selectedCup.y2025)
                  : "-"}
              </strong>
              , 2026년 평균은{" "}
              <strong
                style={{
                  color: GOLD,
                }}
              >
                {selectedCup.y2026
                  ? fmt(selectedCup.y2026)
                  : "-"}
              </strong>
              입니다.
            </>
          ) : (
            <>
              {selectedTeam}의 경우 2025년{" "}
              <strong
                style={{
                  color: GOLD,
                }}
              >
                {selectedCupRank.y2025
                  ? `${selectedCupRank.y2025}위`
                  : "-"}
              </strong>
              , 2026년{" "}
              <strong
                style={{
                  color: GOLD,
                }}
              >
                {selectedCupRank.y2026
                  ? `${selectedCupRank.y2026}위`
                  : "-"}
              </strong>
              입니다.
            </>
          )}
        </p>
           

        <div
          style={{
            background: PANEL,
            border:
              `1px solid ${BORDER}`,
            borderRadius: 8,
            padding:
              "20px 20px 8px",
            marginBottom: 40,
          }}
        >
          <ResponsiveContainer
            width="100%"
            height={340}
          >
            <BarChart
              data={
                CUP_COMPARE
              }
              margin={{
                top: 4,
                right: 12,
                left: -10,
                bottom: 4,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={BORDER}
                vertical={false}
              />

              <XAxis
                dataKey="team"
                tick={{
                  fill: TEXT_DIM,
                  fontSize: 10.5,
                }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={70}
              />

              <YAxis
                tick={{
                  fill: TEXT_DIM,
                  fontSize: 11,
                }}
                tickFormatter={(v) =>
                  `${v / 1000}k`
                }
              />

              <Tooltip
                content={
                  <CustomTooltip />
                }
                cursor={{
                  fill:
                    "rgba(255,255,255,0.03)",
                }}
              />

              <Legend
                wrapperStyle={{
                  fontSize: 12,
                  color: TEXT_DIM,
                }}
              />

              <Bar
                dataKey="y2025"
                name="2025 LCK Cup"
                radius={[
                  3,
                  3,
                  0,
                  0,
                ]}
              >
                {CUP_COMPARE.map(
                  (d, i) => (
                    <Cell
                      key={i}
                      fill={
                        isGenG(
                          d.team
                        )
                          ? "#8A7326"
                          : "#3A3D52"
                      }
                    />
                  )
                )}
              </Bar>

              <Bar
                dataKey="y2026"
                name="2026 Split 1"
                radius={[
                  3,
                  3,
                  0,
                  0,
                ]}
              >
                {CUP_COMPARE.map(
                  (d, i) => (
                    <Cell
                      key={i}
                      fill={
                        isGenG(
                          d.team
                        )
                          ? GOLD
                          : SLATE_LIGHT
                      }
                    />
                  )
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ==================================================
            02 TEAM RANKING
        ================================================== */}
        <SectionLabel
          index="02"
          title="구단별 시청자 순위"
        />

        <p
          style={{
            color: TEXT_DIM,
            fontSize: 12.5,
            marginTop: -8,
            marginBottom: 14,
          }}
        >
          현재 선택한 필터 조건을 기준으로
          구단별 평균 동시시청자를 비교합니다.
        </p>

        <div
          style={{
            background: PANEL,
            border:
              `1px solid ${BORDER}`,
            borderRadius: 8,
            padding:
              "20px 20px 8px",
            marginBottom: 40,
          }}
        >
          {TEAM_SUMMARY.length >
          0 ? (
            <ResponsiveContainer
              width="100%"
              height={380}
            >
              <BarChart
                data={
                  TEAM_SUMMARY
                }
                layout="vertical"
                margin={{
                  top: 4,
                  right: 40,
                  left: 10,
                  bottom: 4,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={BORDER}
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  tick={{
                    fill: TEXT_DIM,
                    fontSize: 11,
                  }}
                  tickFormatter={(v) =>
                    `${v / 1000}k`
                  }
                />

                <YAxis
                  type="category"
                  dataKey="team"
                  tick={{
                    fill: "#E5E7F0",
                    fontSize: 12,
                  }}
                  width={140}
                />

                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                  cursor={{
                    fill:
                      "rgba(255,255,255,0.03)",
                  }}
                />

                <Bar
                  dataKey="avg"
                  name="평균 동시시청자"
                  radius={[
                    0,
                    4,
                    4,
                    0,
                  ]}
                >
                  {TEAM_SUMMARY.map(
                    (d, i) => (
                      <Cell
                        key={i}
                        fill={
                          isGenG(
                            d.team
                          )
                            ? GOLD
                            : SLATE
                        }
                      />
                    )
                  )}

                  <LabelList
                    dataKey="avg"
                    position="right"
                    formatter={fmt}
                    style={{
                      fill: TEXT_DIM,
                      fontSize: 11,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: 300,
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                color: TEXT_DIM,
                fontSize: 13,
              }}
            >
              선택한 조건에
              해당하는 데이터가
              없습니다.
            </div>
          )}
        </div>

        {/* ==================================================
            03 STAGE
        ================================================== */}
        <SectionLabel
          index="03"
          title={`대회 유형별 시청자 — ${stageRow.team}`}
        />

        <p
          style={{
            color: TEXT_DIM,
            fontSize: 12.5,
            marginTop: -8,
            marginBottom: 14,
          }}
        >
          Year와 Platform 필터를
          적용한{" "}
          {selectedTeam ===
          "All"
            ? "전체 구단의"
            : "선택 구단의"}{" "}
          단계별 평균
          동시시청자입니다.
        </p>

        <div
          style={{
            background: PANEL,
            border:
              `1px solid ${BORDER}`,
            borderRadius: 8,
            padding:
              "20px 20px 8px",
            marginBottom: 40,
          }}
        >
          {stageChartData.length >
          0 ? (
            <ResponsiveContainer
              width="100%"
              height={320}
            >
              <BarChart
                data={
                  stageChartData
                }
                margin={{
                  top: 4,
                  right: 12,
                  left: -10,
                  bottom: 4,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={BORDER}
                  vertical={false}
                />

                <XAxis
                  dataKey="stage"
                  tick={{
                    fill: TEXT_DIM,
                    fontSize: 10.5,
                  }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={55}
                />

                <YAxis
                  tick={{
                    fill: TEXT_DIM,
                    fontSize: 11,
                  }}
                  tickFormatter={(v) =>
                    `${v / 1000}k`
                  }
                />

                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                  cursor={{
                    fill:
                      "rgba(255,255,255,0.03)",
                  }}
                />

                <Bar
                  dataKey="value"
                  name="평균 동시시청자"
                  radius={[
                    3,
                    3,
                    0,
                    0,
                  ]}
                  fill={
                    selectedTeam ===
                    "All"
                      ? SLATE_LIGHT
                      : isGenG(
                          stageRow.team
                        )
                      ? GOLD
                      : SLATE_LIGHT
                  }
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: 240,
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                color: TEXT_DIM,
                fontSize: 13,
              }}
            >
              선택한 조건에
              해당하는 데이터가
              없습니다.
            </div>
          )}
        </div>

        {/* ==================================================
            04 TREND
        ================================================== */}
        <SectionLabel
          index="04"
          title="연도별 시즌 초반 시청자 트렌드"
        />

        <p
          style={{
            color: TEXT_DIM,
            fontSize: 12.5,
            marginTop: -8,
            marginBottom: 14,
          }}
        >
          2025년 <strong style={{ color: "#E5E7F0" }}>LCK Cup</strong>과
          2026년 <strong style={{ color: "#E5E7F0" }}>Split 1</strong>의
          <strong style={{ color: "#E5E7F0" }}> 동일 시즌 초반 구간</strong>을 비교합니다.
          <br />
          데이터 범위: <strong style={{ color: "#E5E7F0" }}>2025-01-15 ~ 2025-03-02</strong> /
          <strong style={{ color: "#E5E7F0" }}> 2026-01-17 ~ 2026-03-08</strong>
        </p>

        <div
          style={{
            background: PANEL,
            border:
              `1px solid ${BORDER}`,
            borderRadius: 8,
            padding:
              "20px 20px 8px",
            marginBottom: 40,
          }}
        >
          {YEARLY_TREND.length >
          0 ? (
            <ResponsiveContainer
              width="100%"
              height={240}
            >
              <LineChart
                data={
                  YEARLY_TREND
                }
                margin={{
                  top: 10,
                  right: 20,
                  left: 0,
                  bottom: 4,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={BORDER}
                  vertical={false}
                />

                <XAxis
                  dataKey="year"
                  tick={{
                    fill: TEXT_DIM,
                    fontSize: 12,
                  }}
                />

                <YAxis
                  tick={{ fill: TEXT_DIM, fontSize: 11 }}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                  width={50}
                />

                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                />

                <Line
                  type="monotone"
                  dataKey="value"
                  name="평균 동시시청자"
                  stroke={RED}
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: RED,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: 200,
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                color: TEXT_DIM,
                fontSize: 13,
              }}
            >
              선택한 조건에
              해당하는 데이터가
              없습니다.
            </div>
          )}
        </div>

        {/* ==================================================
            05 + 06
        ================================================== */}
        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          {/* TOP 5 */}
          <div
            style={{
              flex:
                "1 1 460px",
            }}
          >
            <SectionLabel
              index="05"
              title={`${stageRow.team} 최고 흥행 경기 TOP 5`}
            />

            <div
              style={{
                background: PANEL,
                border:
                  `1px solid ${BORDER}`,
                borderRadius: 8,
                overflow:
                  "hidden",
              }}
            >
              {TOP5.length >
              0 ? (
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                    fontSize: 12.5,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom:
                          `1px solid ${BORDER}`,
                      }}
                    >
                      {[
                        "날짜",
                        "단계",
                        "최고 시청자",
                        "평균 시청자",
                      ].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              textAlign:
                                "left",
                              padding:
                                "10px 14px",
                              color:
                                TEXT_DIM,
                              fontWeight:
                                500,
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {TOP5.map(
                      (m, i) => (
                        <tr
                          key={i}
                          style={{
                            borderBottom:
                              i <
                              TOP5.length -
                                1
                                ? `1px solid ${BORDER}`
                                : "none",
                          }}
                        >
                          <td
                            style={{
                              padding:
                                "10px 14px",
                              color:
                                "#E5E7F0",
                            }}
                          >
                            {m.date
                              ? String(m.date).slice(0, 10)
                              : "-"}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px 14px",
                              color:
                                TEXT_DIM,
                            }}
                          >
                            {m.tag}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px 14px",
                              color:
                                GOLD,
                              fontFamily:
                                "ui-monospace, monospace",
                            }}
                          >
                            {fmt(
                              m.peak
                            )}
                          </td>

                          <td
                            style={{
                              padding:
                                "10px 14px",
                              color:
                                TEXT_DIM,
                              fontFamily:
                                "ui-monospace, monospace",
                            }}
                          >
                            {fmt(
                              m.avg
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              ) : (
                <div
                  style={{
                    padding: 40,
                    textAlign:
                      "center",
                    color:
                      TEXT_DIM,
                    fontSize: 13,
                  }}
                >
                  선택한 조건에
                  해당하는 데이터가
                  없습니다.
                </div>
              )}
            </div>

            <div
              style={{
                fontSize: 11.5,
                color: TEXT_DIM,
                marginTop: 8,
              }}
            >
              현재 선택된 필터 조건에서 경기별
              최고 동시시청자를 기준으로 정렬합니다.
            </div>
          </div>

          {/* PLATFORM */}
          <div
            style={{
              flex:
                "1 1 420px",
            }}
          >
            <SectionLabel
              index="06"
              title={`${stageRow.team} 플랫폼별 성과`}
            />

            <div
              style={{
                background: PANEL,
                border:
                  `1px solid ${BORDER}`,
                borderRadius: 8,
                padding:
                  "20px 20px 8px",
              }}
            >
              {PLATFORM_DATA.length >
              0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={240}
                >
                  <BarChart
                    data={
                      PLATFORM_DATA
                    }
                    layout="vertical"
                    margin={{
                      top: 4,
                      right: 30,
                      left: 10,
                      bottom: 4,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={BORDER}
                      horizontal={false}
                    />

                    <XAxis
                      type="number"
                      tick={{
                        fill: TEXT_DIM,
                        fontSize: 10.5,
                      }}
                      tickFormatter={(v) =>
                        `${v / 1000}k`
                      }
                    />

                    <YAxis
                      type="category"
                      dataKey="platform"
                      tick={{
                        fill:
                          "#E5E7F0",
                        fontSize: 11.5,
                      }}
                      width={70}
                    />

                    <Tooltip
                      content={
                        <CustomTooltip />
                      }
                      cursor={{
                        fill:
                          "rgba(255,255,255,0.03)",
                      }}
                    />

                    <Bar
                      dataKey="avg"
                      name="평균 동시시청자"
                      radius={[
                        0,
                        4,
                        4,
                        0,
                      ]}
                      fill={
                        selectedTeam ===
                        "All"
                          ? SLATE_LIGHT
                          : GOLD
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    height: 200,
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    color:
                      TEXT_DIM,
                    fontSize: 13,
                  }}
                >
                  선택한 조건에
                  해당하는 데이터가
                  없습니다.
                </div>
              )}
            </div>

            <div
              style={{
                fontSize: 11.5,
                color: TEXT_DIM,
                marginTop: 8,
              }}
            >
              현재 선택된 필터 조건에서 플랫폼별 평균 동시시청자를 비교합니다.
            </div>
          </div>
        </div>

        {/* ==================================================
            FOOTNOTE
        ================================================== */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 16,
            borderTop:
              `1px solid ${BORDER}`,
            fontSize: 11.5,
            color: TEXT_DIM,
            lineHeight: 1.8,
          }}
        >
          모든 수치는 연결된
          Google Sheets
          Dashboard_Data를 기준으로
          자동 계산됩니다.
          <br />
          필터 변경 시 해당 조건에
          맞는 데이터로 KPI 및 차트가
          다시 계산됩니다.
        </div>
      </div>
    </div>
  );
}
