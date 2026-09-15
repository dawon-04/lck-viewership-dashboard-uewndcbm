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
  "Split 2 — Regular Season",
  "Split 2 — Road to MSI",
  "First Stand",
  "MSI",
  "Split 3",
  "Worlds",
];

// ============================================================
// 구단별 분석 참고사항 및 이력 (Team Insight Notes)
// ============================================================
const TEAM_NOTES = {
  "Gen.G": {
    nameKo: "젠지",
    note: "2018년 KSV e스포츠가 삼성 갤럭시 로스터와 LCK 자리를 인수하며 리브랜딩. 2024·2025 MSI 연속 우승, 2025 LCK 시즌 챔피언.",
  },
  "T1": {
    nameKo: "T1",
    note: "1999년 SK텔레콤 T1으로 창단, 2019년 T1으로 사명 변경. 롤드컵 4회 우승(2013·2015·2016·2023)으로 역대 최다 우승 구단.",
  },
  "Hanwha Life Esports": {
    nameKo: "한화생명e스포츠",
    note: "구 ROX Tigers. 2018년 한화생명이 로스터와 LCK 자리를 인수해 리브랜딩. 2024 LCK 서머, 2025 LCK Cup·First Stand 우승.",
  },
  "kt Rolster": {
    nameKo: "KT 롤스터",
    note: "1999년 창단, KT가 스폰서인 국내 최장수 e스포츠 구단 중 하나.",
  },
  "Dplus Kia": {
    nameKo: "디플러스 기아",
    note: "2017년 DAMWON Gaming으로 창단 → 2021년 DWG KIA → 2023년 Dplus Kia로 명칭 변경. 2020 롤드컵 우승.",
  },
  "Nongshim RedForce": {
    nameKo: "농심 레드포스",
    note: "구 Team Dynamics. 2020년 농심이 인수해 리브랜딩. 팀명·로고는 농심 신라면 브랜드에서 착안.",
  },
  "BNK FEARX": {
    nameKo: "BNK 피어엑스",
    note: "Team BattleComics → SANDBOX Gaming(2018) → Liiv SANDBOX(2020, KB국민은행) → FearX(2024) → BNK FearX(2024, BNK금융그룹) 순으로 리브랜딩.",
  },
  "KIWOOM DRX": {
    nameKo: "키움 DRX",
    note: "Incredible Miracle(2012) → Longzhu Gaming → Kingzone DragonX(2018) → DragonX(2019) → DRX(2020) → 2026년 키움증권 스폰서십으로 현재 명칭. 2022 롤드컵 우승(플레이-인부터 출발해 우승한 유일 사례). (데이터 내 과도기적 명칭 혼재 주의)",
  },
  "HANJIN BRION": {
    nameKo: "한진 브리온",
    note: "Team BRION → Fredit BRION(2020~2022, 한국야쿠르트) → OK저축은행 브리온(2023~2025) → 2026년 한진 스폰서십으로 현재 명칭. 방송 약어는 BRO로 유지.",
  },
  "DN SOOPers": {
    nameKo: "DN 수퍼스",
    note: "광동 프릭스 → DN Freecs → DN SOOPers 순으로 리브랜딩(구 약어: DNF/DNS). 스트리밍 플랫폼 SOOP와 파트너십 연계.",
  },
};

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
  // 01 HALF-YEAR (1H) COMPARISON (상반기 전체 누적 비교)
  // ==========================================================
  const HALF_YEAR_COMPARE = useMemo(() => {
    const getHalfYearData = (year: string) => {
      return data.filter((r) => {
        const platformMatch =
          selectedPlatform === "All" ||
          String(r.Platform || "").trim() === selectedPlatform;

        const stage = String(r.Stage || "").trim();
        const isFirstHalf =
          stage === "LCK Cup" ||
          stage === "Split 1" ||
          stage === "Split 2 — Regular Season" ||
          stage === "Split 2 — Road to MSI";

        return (
          String(r.Year || "").trim() === year &&
          isFirstHalf &&
          platformMatch
        );
      });
    };

    const half2025 = getHalfYearData("2025");
    const half2026 = getHalfYearData("2026");

    const teams = Array.from(
      new Set(
        [...half2025, ...half2026]
          .map((r) => String(r.Team_Full || "").trim())
          .filter(Boolean)
      )
    );

    return teams
      .map((team) => {
        const data2025 = half2025.filter(
          (r) => String(r.Team_Full || "").trim() === team
        );
        const data2026 = half2026.filter(
          (r) => String(r.Team_Full || "").trim() === team
        );

        const avg2025 =
          data2025.length > 0
            ? Math.round(
                avg(data2025.map((r) => toNumber(r.Avg_Viewers)))
              )
            : 0;

        const avg2026 =
          data2026.length > 0
            ? Math.round(
                avg(data2026.map((r) => toNumber(r.Avg_Viewers)))
              )
            : 0;

        const yoy =
          avg2025 > 0
            ? Number(
                (((avg2026 / avg2025) - 1) * 100).toFixed(1)
              )
            : 0;

        return {
          team,
          y2025: avg2025,
          y2026: avg2026,
          yoy,
        };
      })
      .sort((a, b) => b.y2026 - a.y2026);
  }, [data, selectedPlatform]);

  // ==========================================================
  // SELECTED TEAM HALF-YEAR
  // ==========================================================
  const selectedHalfYear = useMemo(() => {
    if (selectedTeam === "All") {
      const getFirstHalfRows = (yr) =>
        data.filter((r) => {
          const stage = String(r.Stage || "").trim();
          const isFirstHalf =
            stage === "LCK Cup" ||
            stage === "Split 1" ||
            stage === "Split 2 — Regular Season" ||
            stage === "Split 2 — Road to MSI";
          return (
            Number(r.Year) === yr &&
            isFirstHalf &&
            (selectedPlatform === "All" ||
              String(r.Platform || "").trim() === selectedPlatform)
          );
        });

      const y2025 = Math.round(avg(getFirstHalfRows(2025).map((r) => toNumber(r.Avg_Viewers))));
      const y2026 = Math.round(avg(getFirstHalfRows(2026).map((r) => toNumber(r.Avg_Viewers))));

      return {
        y2025,
        y2026,
        yoy: y2025 > 0 ? Number((((y2026 / y2025) - 1) * 100).toFixed(1)) : 0,
      };
    }

    const row = HALF_YEAR_COMPARE.find((r) => r.team === selectedTeam);
    if (!row) return { y2025: 0, y2026: 0, yoy: 0 };
    return { y2025: row.y2025, y2026: row.y2026, yoy: row.yoy };
  }, [HALF_YEAR_COMPARE, selectedTeam, data, selectedPlatform]);

  // ==========================================================
  // HALF-YEAR RANK
  // ==========================================================
  const selectedHalfYearRank = useMemo(() => {
    if (selectedTeam === "All") return { y2025: 0, y2026: 0 };

    const rankForYear = (key) => {
      const sorted = [...HALF_YEAR_COMPARE]
        .filter((r) => r[key] != null)
        .sort((a, b) => b[key] - a[key]);
      const index = sorted.findIndex((r) => r.team === selectedTeam);
      return index >= 0 ? index + 1 : 0;
    };

    return {
      y2025: rankForYear("y2025"),
      y2026: rankForYear("y2026"),
    };
  }, [HALF_YEAR_COMPARE, selectedTeam]);

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

      return {
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
  // YEARLY TREND (04 섹션: 상반기 전체 트렌드 비교)
  // ==========================================================
  const YEARLY_TREND = useMemo(() => {
    const getFirstHalfAvg = (yrVal) => {
      return avg(
        data
          .filter((r) => {
            const teamMatch =
              selectedTeam === "All" ||
              String(r.Team_Full || "").trim() === selectedTeam;

            const platformMatch =
              selectedPlatform === "All" ||
              String(r.Platform || "").trim() === selectedPlatform;

            const stage = String(r.Stage || "").trim();
            const isFirstHalf =
              stage === "LCK Cup" ||
              stage === "Split 1" ||
              stage === "Split 2 — Regular Season" ||
              stage === "Split 2 — Road to MSI";

            return (
              teamMatch &&
              platformMatch &&
              String(r.Year || "").trim() === yrVal &&
              isFirstHalf
            );
          })
          .map((r) => toNumber(r.Avg_Viewers))
      );
    };

    const trendData = [
      {
        year: "2025 상반기",
        value: getFirstHalfAvg("2025"),
      },
      {
        year: "2026 상반기",
        value: getFirstHalfAvg("2026"),
      },
    ];

    return trendData.filter((d) => d.value > 0);
  }, [data, selectedTeam, selectedPlatform]);

  // ==========================================================
  // TOP 5
  // ==========================================================
  const TOP5 =
    useMemo(() => {
      const rows = filteredData;
      const grouped = {};

      rows.forEach((r) => {
        const date = r.Date || "Unknown";
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(r);
      });

      const matches = Object.entries(grouped).map(([date, rows]) => {
        const peak = Math.max(
          ...rows.map((r) => toNumber(r.Peak_Viewers_sub))
        );

        const average = Math.round(
          avg(rows.map((r) => toNumber(r.Avg_Viewers)))
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
      });

      return matches
        .sort((a, b) => b.peak - a.peak)
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
  // Dashboard Render
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
            flexWrap: "wrap", // 창이 좁아지면 아래로 떨어지게 처리
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
              LCK VIEWERSHIP (2025~2026 상반기)
            </div>

            <h1
              style={{
                fontSize: "clamp(22px, 4vw, 30px)", // 화면 크기에 따라 글씨 크기 유연 조절
                fontWeight: 800,
                margin: 0,
                letterSpacing: -0.5,
                color: "#FAFAFC",
                lineHeight: 1.3, // 글씨 간격(행간)을 넉넉히 주어 겹침 방지
              }}
            >
              구단별 시청자 데이터 대시보드
            </h1>
          </div>

          <div
            style={{
              fontSize: 11.5,
              color: TEXT_DIM,
              textAlign: "right",
              lineHeight: 1.6,
            }}
          >
            Interactive Dashboard
            <br />
            2025~2026 상반기 LCK · Worlds · MSI 통합 데이터 기준 (2026 First Stand는 분석 제외)
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
            TEAM INSIGHT NOTE CARD (팀 선택 시 데이터 참고사항 출력)
        ================================================== */}
        {selectedTeam !== "All" && TEAM_NOTES[selectedTeam] && (
          <div
            style={{
              background: PANEL,
              border: `1px solid ${GOLD}`,
              borderRadius: 8,
              padding: "16px 20px",
              marginBottom: 28,
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              boxShadow: "0 4px 20px rgba(212, 175, 55, 0.08)",
            }}
          >
            <div
              style={{
                background: "rgba(212, 175, 55, 0.15)",
                color: GOLD,
                fontSize: 11,
                fontWeight: 800,
                padding: "4px 8px",
                borderRadius: 4,
                fontFamily: "ui-monospace, monospace",
                whiteSpace: "nowrap",
                letterSpacing: 1,
              }}
            >
              TEAM INSIGHT
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#FAFAFC",
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {selectedTeam}
                <span style={{ fontSize: 12, color: TEXT_DIM, fontWeight: 400 }}>
                  ({TEAM_NOTES[selectedTeam].nameKo}) 데이터 분석 노트
                </span>
              </div>

              <div
                style={{
                  fontSize: 12.5,
                  color: "#D0D5E2",
                  lineHeight: 1.6,
                }}
              >
                {TEAM_NOTES[selectedTeam].note}
              </div>
            </div>
          </div>
        )}

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
                    minWidth: 120,
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
                      fontSize: 12,
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
            01 TEAM RANKING
        ================================================== */}
        <SectionLabel
          index="01"
          title="구단별 시청자 순위 (공식 풀네임)"
        />

        <p
          style={{
            color: TEXT_DIM,
            fontSize: 12.5,
            marginTop: -8,
            marginBottom: 14,
          }}
        >
          현재 선택한 필터 조건을 기준으로 구단별 평균 동시시청자를 비교합니다. (KIWOOM DRX 등 최신 공식 구단명 일괄 적용)
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
              height={390}
            >
              <BarChart
                data={
                  TEAM_SUMMARY
                }
                layout="vertical"
                margin={{
                  top: 4,
                  right: 45,
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
                    fontSize: 11.5,
                  }}
                  width={155}
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
            02 HALF-YEAR (1H) COMPARISON
        ================================================== */}
        <SectionLabel
          index="02"
          title="상반기 동일기간 비교 (2025 상반기 vs 2026 상반기)"
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
          2025년 상반기와 2026년 상반기의{" "}
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
              전체 구단 기준 2025년 상반기 평균은{" "}
              <strong
                style={{
                  color: GOLD,
                }}
              >
                {selectedHalfYear.y2025
                  ? fmt(selectedHalfYear.y2025)
                  : "-"}
              </strong>
              , 2026년 상반기 평균은{" "}
              <strong
                style={{
                  color: GOLD,
                }}
              >
                {selectedHalfYear.y2026
                  ? fmt(selectedHalfYear.y2026)
                  : "-"}
              </strong>
              입니다.
            </>
          ) : (
            <>
              {selectedTeam}의 경우 2025년 상반기{" "}
              <strong
                style={{
                  color: GOLD,
                }}
              >
                {selectedHalfYearRank.y2025
                  ? `${selectedHalfYearRank.y2025}위`
                  : "-"}
              </strong>
              , 2026년 상반기{" "}
              <strong
                style={{
                  color: GOLD,
                }}
              >
                {selectedHalfYearRank.y2026
                  ? `${selectedHalfYearRank.y2026}위`
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
                HALF_YEAR_COMPARE
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
                height={75}
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
                name="2025 상반기"
                radius={[
                  3,
                  3,
                  0,
                  0,
                ]}
              >
                {HALF_YEAR_COMPARE.map(
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
                name="2026 상반기"
                radius={[
                  3,
                  3,
                  0,
                  0,
                ]}
              >
                {HALF_YEAR_COMPARE.map(
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
            03 TREND
        ================================================== */}
        <SectionLabel
          index="03"
          title="연도별 상반기 전체 시청자 트렌드"
        />

        <p
          style={{
            color: TEXT_DIM,
            fontSize: 12.5,
            marginTop: -8,
            marginBottom: 14,
          }}
        >
          2025년 상반기와 2026년 상반기의 <strong style={{ color: "#E5E7F0" }}>전체 경기 평균 시청자</strong> 추이를 비교합니다.
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
                  name="상반기 평균 동시시청자"
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
            04 STAGE
        ================================================== */}
        <SectionLabel
          index="04"
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
          Year와 Platform 필터를 적용한{" "}
          {selectedTeam === "All" ? "전체 구단의" : "선택 구단의"}{" "}
          대회 단계별 평균 동시시청자입니다. (2026 Split 2 정규시즌 및 Road to MSI 포함)
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
                  height={65}
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
          2025~2026 상반기 LCK · Worlds · MSI 통합 데이터 기준 (2026 First Stand는 분석 제외)
          <br />
          모든 수치는 연결된 Google Sheets 실시간 데이터를 기준으로 자동 계산됩니다.
        </div>
      </div>
    </div>
  );
}
