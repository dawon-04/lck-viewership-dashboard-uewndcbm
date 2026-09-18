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
  Channel_Type_Final?: string;
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
  return values.reduce((a, b) => a + b, 0) / values.length;
};

const fmt = (n) =>
  typeof n === "number" ? Math.round(n).toLocaleString("ko-KR") : n;

const isGenG = (team) => team === "Gen.G";

const cleanValue = (value) => String(value || "").trim();

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
// 구단별 분석 참고사항 및 이력
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
    nameKo: "kt 롤스터",
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
    note: "Team BattleComics → SANDBOX Gaming(2018) → Liiv SANDBOX(2020, KB국민은행) → FearX(2024) → BNK FearX(2024) 순으로 리브랜딩.",
  },
  "KIWOOM DRX": {
    nameKo: "키움 DRX",
    note: "Incredible Miracle(2012) → Longzhu Gaming → Kingzone DragonX(2018) → DragonX(2019) → DRX(2020) → 2026년 키움증권 스폰서십. 2022 롤드컵 우승.",
  },
  "HANJIN BRION": {
    nameKo: "한진 브리온",
    note: "Team BRION → Fredit BRION → OK저축은행 브리온 → 2026년 한진 스폰서십.",
  },
  "DN SOOPers": {
    nameKo: "DN 수퍼스",
    note: "광동 프릭스 → DN Freecs → DN SOOPers 순으로 리브랜딩.",
  },
};

// ============================================================
// Team Summary
// ============================================================
const getTeamSummary = (rows: DashboardRow[]) => {
  const teams = [
    ...new Set(
      rows
        .map((r) => cleanValue(r.Team_Full))
        .filter(Boolean)
    ),
  ];

  const result = teams.map((team) => {
    const teamRows = rows.filter(
      (r) => cleanValue(r.Team_Full) === team
    );

    const avgViewers = avg(
      teamRows.map((r) => toNumber(r.Avg_Viewers))
    );

    const peakValues = teamRows.map((r) =>
      toNumber(r.Peak_Viewers_sub)
    );

    return {
      team,
      avg: Math.round(avgViewers),
      peak: peakValues.length ? Math.max(...peakValues) : 0,
      n: teamRows.length,
    };
  });

  result.sort((a, b) => b.avg - a.avg);

  const leagueAvg = avg(result.map((t) => t.avg));

  return result.map((t, index) => ({
    ...t,
    rank: index + 1,
    vsLeague:
      leagueAvg > 0
        ? Number((((t.avg / leagueAvg) - 1) * 100).toFixed(1))
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
// Components
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
          fontFamily: "ui-monospace, monospace",
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

function StatBlock({ label, value, sub, accent }) {
  return (
    <div style={{ flex: 1, minWidth: 150 }}>
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
          color: accent || "#F2F3F7",
          fontFamily: "ui-monospace, monospace",
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

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;

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
            color: p.color || TEXT_DIM,
          }}
        >
          {p.name}: {fmt(toNumber(p.value))}
          {unit || "명"}
        </div>
      ))}
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div
      style={{
        minWidth: 140,
        flex: "1 1 140px",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: TEXT_DIM,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: 1,
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {label}
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function GenGDashboard() {
  const [data, setData] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ----------------------------------------------------------
  // Filter states
  // ----------------------------------------------------------
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedStage, setSelectedStage] = useState("All");
  const [selectedTeam, setSelectedTeam] = useState("Gen.G");
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [selectedChannelTypeFinal, setSelectedChannelTypeFinal] =
    useState("All");

  // ----------------------------------------------------------
  // Channel Type helper
  // ----------------------------------------------------------
  const getChannelTypeFinalVal = (r: DashboardRow) => {
    const raw = r.Channel_Type_Final || "";
    return String(raw).trim()
      ? String(raw).trim()
      : "Unclassified";
  };

  // ==========================================================
  // Load Google Sheets data
  // ==========================================================
  useEffect(() => {
    Papa.parse<DashboardRow>(SHEET_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,

      transformHeader: (header) =>
        String(header).replace(/^\uFEFF/, "").trim(),

      complete: (results) => {
        if (!results.data.length) {
          setError("Google Sheets에 데이터가 없습니다.");
          setLoading(false);
          return;
        }

        setData(results.data);
        setLoading(false);
      },

      error: () => {
        setError("Google Sheets 데이터를 불러오지 못했습니다.");
        setLoading(false);
      },
    });
  }, []);

  // ==========================================================
  // 기본 matching helpers
  // ==========================================================
  const matchesStage = (row, stage) =>
    stage === "All" ||
    cleanValue(row.Stage) === stage;

  const matchesChannelTypeFinal = (row) =>
    selectedChannelTypeFinal === "All" ||
    getChannelTypeFinalVal(row) === selectedChannelTypeFinal;

  // ==========================================================
  // 메인 데이터 필터링
  // ==========================================================
  const filteredData = useMemo(() => {
    return data.filter((r) => {
      const yearMatch =
        selectedYear === "All" ||
        cleanValue(r.Year) === selectedYear;

      const stageMatch =
        selectedStage === "All" ||
        cleanValue(r.Stage) === selectedStage;

      const teamMatch =
        selectedTeam === "All" ||
        cleanValue(r.Team_Full) === selectedTeam;

      const platformMatch =
        selectedPlatform === "All" ||
        cleanValue(r.Platform) === selectedPlatform;

      const channelTypeFinalMatch =
        selectedChannelTypeFinal === "All" ||
        getChannelTypeFinalVal(r) === selectedChannelTypeFinal;

      return (
        yearMatch &&
        stageMatch &&
        teamMatch &&
        platformMatch &&
        channelTypeFinalMatch
      );
    });
  }, [
    data,
    selectedYear,
    selectedStage,
    selectedTeam,
    selectedPlatform,
    selectedChannelTypeFinal,
  ]);

  // ==========================================================
  // DYNAMIC CASCADING FILTER OPTIONS
  //
  // 핵심 원칙:
  //
  // 각 필터의 옵션을 계산할 때
  // → 자기 자신의 조건은 제외
  // → 나머지 모든 현재 선택 조건은 적용
  //
  // 예:
  //
  // Stage options:
  // Year + Team + Platform + Channel Type 적용
  // Stage 자체 조건은 제외
  //
  // Team options:
  // Year + Stage + Platform + Channel Type 적용
  // Team 자체 조건은 제외
  //
  // 이렇게 하면 모든 필터가 서로 연결된
  // 완전한 cascading filter가 된다.
  // ==========================================================
  const dynamicFilterOptions = useMemo(() => {
    // --------------------------------------------------------
    // 현재 row가 "특정 필터를 제외한 나머지 조건"을
    // 모두 만족하는지 확인
    // --------------------------------------------------------
    const matchesOtherFilters = (
      row: DashboardRow,
      excludedFilter: string
    ) => {
      const year = cleanValue(row.Year);
      const stage = cleanValue(row.Stage);
      const team = cleanValue(row.Team_Full);
      const platform = cleanValue(row.Platform);
      const channel = getChannelTypeFinalVal(row);

      // Year 조건
      if (
        excludedFilter !== "year" &&
        selectedYear !== "All" &&
        year !== selectedYear
      ) {
        return false;
      }

      // Stage 조건
      if (
        excludedFilter !== "stage" &&
        selectedStage !== "All" &&
        stage !== selectedStage
      ) {
        return false;
      }

      // Team 조건
      if (
        excludedFilter !== "team" &&
        selectedTeam !== "All" &&
        team !== selectedTeam
      ) {
        return false;
      }

      // Platform 조건
      if (
        excludedFilter !== "platform" &&
        selectedPlatform !== "All" &&
        platform !== selectedPlatform
      ) {
        return false;
      }

      // Channel Type 조건
      if (
        excludedFilter !== "channel" &&
        selectedChannelTypeFinal !== "All" &&
        channel !== selectedChannelTypeFinal
      ) {
        return false;
      }

      return true;
    };

    // --------------------------------------------------------
    // Unique option 생성 helper
    // --------------------------------------------------------
    const getUniqueOptions = (
      excludedFilter: string,
      getter: (row: DashboardRow) => string
    ) => {
      const values = data
        .filter((row) =>
          matchesOtherFilters(row, excludedFilter)
        )
        .map(getter)
        .map((value) => String(value || "").trim())
        .filter(Boolean);

      return Array.from(new Set(values));
    };

    // --------------------------------------------------------
    // YEAR
    // --------------------------------------------------------
    const rawYears = getUniqueOptions(
      "year",
      (r) => cleanValue(r.Year)
    );

    const years = [
      "All",
      ...rawYears.sort((a, b) => {
        const numA = Number(a);
        const numB = Number(b);

        if (Number.isFinite(numA) && Number.isFinite(numB)) {
          return numA - numB;
        }

        return a.localeCompare(b);
      }),
    ];

    // --------------------------------------------------------
    // STAGE
    //
    // STAGE_ORDER에 존재하는 순서를 우선 사용하고,
    // 데이터에만 존재하는 새로운 Stage가 있다면 뒤에 추가.
    // --------------------------------------------------------
    const rawStages = getUniqueOptions(
      "stage",
      (r) => cleanValue(r.Stage)
    );

    const orderedStages = STAGE_ORDER.filter((stage) =>
      rawStages.includes(stage)
    );

    const extraStages = rawStages
      .filter((stage) => !STAGE_ORDER.includes(stage))
      .sort((a, b) => a.localeCompare(b));

    const stages = [
      "All",
      ...orderedStages,
      ...extraStages,
    ];

    // --------------------------------------------------------
    // TEAM
    // --------------------------------------------------------
    const rawTeams = getUniqueOptions(
      "team",
      (r) => cleanValue(r.Team_Full)
    );

    const teams = [
      "All",
      ...rawTeams.sort((a, b) => a.localeCompare(b)),
    ];

    // --------------------------------------------------------
    // PLATFORM
    // --------------------------------------------------------
    const rawPlatforms = getUniqueOptions(
      "platform",
      (r) => cleanValue(r.Platform)
    );

    const platforms = [
      "All",
      ...rawPlatforms.sort((a, b) => a.localeCompare(b)),
    ];

    // --------------------------------------------------------
    // CHANNEL TYPE
    // --------------------------------------------------------
    const rawChannels = getUniqueOptions(
      "channel",
      (r) => getChannelTypeFinalVal(r)
    );

    const channelTypeFinals = [
      "All",
      ...rawChannels.sort((a, b) => a.localeCompare(b)),
    ];

    return {
      years,
      stages,
      teams,
      platforms,
      channelTypeFinals,
    };
  }, [
    data,
    selectedYear,
    selectedStage,
    selectedTeam,
    selectedPlatform,
    selectedChannelTypeFinal,
  ]);

  // ==========================================================
  // 현재 선택값이 더 이상 유효하지 않으면 자동으로 All
  //
  // 예:
  // 현재 Stage = Worlds
  // Year = 2026
  //
  // → 2026 데이터에 Worlds가 없으면
  // Stage가 자동으로 All로 변경됨.
  // ==========================================================
  useEffect(() => {
    if (
      selectedYear !== "All" &&
      !dynamicFilterOptions.years.includes(selectedYear)
    ) {
      setSelectedYear("All");
    }

    if (
      selectedStage !== "All" &&
      !dynamicFilterOptions.stages.includes(selectedStage)
    ) {
      setSelectedStage("All");
    }

    if (
      selectedTeam !== "All" &&
      !dynamicFilterOptions.teams.includes(selectedTeam)
    ) {
      setSelectedTeam("All");
    }

    if (
      selectedPlatform !== "All" &&
      !dynamicFilterOptions.platforms.includes(selectedPlatform)
    ) {
      setSelectedPlatform("All");
    }

    if (
      selectedChannelTypeFinal !== "All" &&
      !dynamicFilterOptions.channelTypeFinals.includes(
        selectedChannelTypeFinal
      )
    ) {
      setSelectedChannelTypeFinal("All");
    }
  }, [dynamicFilterOptions]);

  // ==========================================================
  // Reset
  // ==========================================================
  const resetFilters = () => {
    setSelectedYear("All");
    setSelectedStage("All");
    setSelectedTeam("All");
    setSelectedPlatform("All");
    setSelectedChannelTypeFinal("All");
  };

  // ==========================================================
  // Ranking Data
  // ==========================================================
  const rankingData = useMemo(() => {
    return data.filter((r) => {
      const yearMatch =
        selectedYear === "All" ||
        cleanValue(r.Year) === selectedYear;

      const stageMatch =
        selectedStage === "All" ||
        cleanValue(r.Stage) === selectedStage;

      const platformMatch =
        selectedPlatform === "All" ||
        cleanValue(r.Platform) === selectedPlatform;

      const channelTypeFinalMatch =
        selectedChannelTypeFinal === "All" ||
        getChannelTypeFinalVal(r) === selectedChannelTypeFinal;

      return (
        yearMatch &&
        stageMatch &&
        platformMatch &&
        channelTypeFinalMatch
      );
    });
  }, [
    data,
    selectedYear,
    selectedStage,
    selectedPlatform,
    selectedChannelTypeFinal,
  ]);

  // ==========================================================
  // Team Summary
  // ==========================================================
  const TEAM_SUMMARY = useMemo(
    () => getTeamSummary(rankingData),
    [rankingData]
  );

  // ==========================================================
  // Selected Team Data
  // ==========================================================
  const selectedTeamData = useMemo(() => {
    if (selectedTeam === "All") {
      const avgViewers = avg(
        filteredData.map((r) =>
          toNumber(r.Avg_Viewers)
        )
      );

      const peakValues = filteredData.map((r) =>
        toNumber(r.Peak_Viewers_sub)
      );

      return {
        team: "All Teams",
        avg: Math.round(avgViewers),
        peak: peakValues.length
          ? Math.max(...peakValues)
          : 0,
        n: filteredData.length,
        rank: 0,
        vsLeague: 0,
      };
    }

    return (
      TEAM_SUMMARY.find(
        (t) => t.team === selectedTeam
      ) || {
        team: selectedTeam,
        avg: 0,
        peak: 0,
        n: 0,
        rank: 0,
        vsLeague: 0,
      }
    );
  }, [TEAM_SUMMARY, selectedTeam, filteredData]);

  // ==========================================================
  // Half Year Comparison
  // ==========================================================
  const HALF_YEAR_COMPARE = useMemo(() => {
    const getHalfYearData = (year: string) => {
      return data.filter((r) => {
        const platformMatch =
          selectedPlatform === "All" ||
          cleanValue(r.Platform) === selectedPlatform;

        const channelTypeFinalMatch =
          selectedChannelTypeFinal === "All" ||
          getChannelTypeFinalVal(r) ===
            selectedChannelTypeFinal;

        const stage = cleanValue(r.Stage);

        const isFirstHalf = [
          "LCK Cup",
          "Split 1",
          "Split 2 — Regular Season",
          "Split 2 — Road to MSI",
        ].includes(stage);

        return (
          cleanValue(r.Year) === year &&
          isFirstHalf &&
          platformMatch &&
          channelTypeFinalMatch
        );
      });
    };

    const half2025 = getHalfYearData("2025");
    const half2026 = getHalfYearData("2026");

    const teams = Array.from(
      new Set(
        [...half2025, ...half2026]
          .map((r) => cleanValue(r.Team_Full))
          .filter(Boolean)
      )
    );

    return teams
      .map((team) => {
        const data2025 = half2025.filter(
          (r) => cleanValue(r.Team_Full) === team
        );

        const data2026 = half2026.filter(
          (r) => cleanValue(r.Team_Full) === team
        );

        const avg2025 =
          data2025.length > 0
            ? Math.round(
                avg(
                  data2025.map((r) =>
                    toNumber(r.Avg_Viewers)
                  )
                )
              )
            : 0;

        const avg2026 =
          data2026.length > 0
            ? Math.round(
                avg(
                  data2026.map((r) =>
                    toNumber(r.Avg_Viewers)
                  )
                )
              )
            : 0;

        return {
          team,
          y2025: avg2025,
          y2026: avg2026,
          yoy:
            avg2025 > 0
              ? Number(
                  (
                    ((avg2026 / avg2025) - 1) *
                    100
                  ).toFixed(1)
                )
              : 0,
        };
      })
      .sort((a, b) => b.y2026 - a.y2026);
  }, [
    data,
    selectedPlatform,
    selectedChannelTypeFinal,
  ]);

  // ==========================================================
  // Stage Row
  // ==========================================================
  const stageRow = useMemo(() => {
    const baseRows = data.filter((r) => {
      const yearMatch =
        selectedYear === "All" ||
        cleanValue(r.Year) === selectedYear;

      const platformMatch =
        selectedPlatform === "All" ||
        cleanValue(r.Platform) === selectedPlatform;

      const channelTypeFinalMatch =
        selectedChannelTypeFinal === "All" ||
        getChannelTypeFinalVal(r) ===
          selectedChannelTypeFinal;

      const teamMatch =
        selectedTeam === "All" ||
        cleanValue(r.Team_Full) === selectedTeam;

      return (
        yearMatch &&
        platformMatch &&
        channelTypeFinalMatch &&
        teamMatch
      );
    });

    const getStageAvg = (stage) => {
      const rows = baseRows.filter(
        (r) => cleanValue(r.Stage) === stage
      );

      return rows.length
        ? Math.round(
            avg(
              rows.map((r) =>
                toNumber(r.Avg_Viewers)
              )
            )
          )
        : null;
    };

    return {
      team:
        selectedTeam === "All"
          ? "All Teams"
          : selectedTeam,

      "LCK Cup": getStageAvg("LCK Cup"),
      "Split 1": getStageAvg("Split 1"),
      "Split 2 — Regular Season": getStageAvg(
        "Split 2 — Regular Season"
      ),
      "Split 2 — Road to MSI": getStageAvg(
        "Split 2 — Road to MSI"
      ),
      "First Stand": getStageAvg("First Stand"),
      MSI: getStageAvg("MSI"),
      "Split 3": getStageAvg("Split 3"),
      Worlds: getStageAvg("Worlds"),
    };
  }, [
    data,
    selectedTeam,
    selectedYear,
    selectedPlatform,
    selectedChannelTypeFinal,
  ]);

  const stageChartData = useMemo(() => {
    return STAGE_ORDER
      .map((stage) => ({
        stage,
        value: stageRow[stage],
      }))
      .filter((d) => d.value != null);
  }, [stageRow]);

  // ==========================================================
  // Yearly Trend
  // ==========================================================
  const YEARLY_TREND = useMemo(() => {
    const getFirstHalfAvg = (yrVal) => {
      return avg(
        data
          .filter((r) => {
            const teamMatch =
              selectedTeam === "All" ||
              cleanValue(r.Team_Full) === selectedTeam;

            const platformMatch =
              selectedPlatform === "All" ||
              cleanValue(r.Platform) === selectedPlatform;

            const channelTypeFinalMatch =
              selectedChannelTypeFinal === "All" ||
              getChannelTypeFinalVal(r) ===
                selectedChannelTypeFinal;

            const stage = cleanValue(r.Stage);

            const isFirstHalf = [
              "LCK Cup",
              "Split 1",
              "Split 2 — Regular Season",
              "Split 2 — Road to MSI",
            ].includes(stage);

            return (
              teamMatch &&
              platformMatch &&
              channelTypeFinalMatch &&
              cleanValue(r.Year) === yrVal &&
              isFirstHalf
            );
          })
          .map((r) => toNumber(r.Avg_Viewers))
      );
    };

    return [
      {
        year: "2025 상반기",
        value: getFirstHalfAvg("2025"),
      },
      {
        year: "2026 상반기",
        value: getFirstHalfAvg("2026"),
      },
    ].filter((d) => d.value > 0);
  }, [
    data,
    selectedTeam,
    selectedPlatform,
    selectedChannelTypeFinal,
  ]);

  // ==========================================================
  // TOP 5
  // ==========================================================
  const TOP5 = useMemo(() => {
    const grouped = {};

    filteredData.forEach((r) => {
      const date = r.Date || "Unknown";

      if (!grouped[date]) {
        grouped[date] = [];
      }

      grouped[date].push(r);
    });

    return Object.entries(grouped)
      .map(([date, rows]: [string, any[]]) => ({
        date,
        tag:
          rows[0]?.Stage ||
          rows[0]?.Tournament ||
          "Event",

        peak: Math.max(
          ...rows.map((r) =>
            toNumber(r.Peak_Viewers_sub)
          )
        ),

        avg: Math.round(
          avg(
            rows.map((r) =>
              toNumber(r.Avg_Viewers)
            )
          )
        ),
      }))
      .sort((a, b) => b.peak - a.peak)
      .slice(0, 5);
  }, [filteredData]);

  // ==========================================================
  // Platform Data
  // ==========================================================
  const PLATFORM_DATA = useMemo(() => {
    const baseRows = data.filter((r) => {
      const teamMatch =
        selectedTeam === "All" ||
        cleanValue(r.Team_Full) === selectedTeam;

      const yearMatch =
        selectedYear === "All" ||
        cleanValue(r.Year) === selectedYear;

      const stageMatch =
        selectedStage === "All" ||
        cleanValue(r.Stage) === selectedStage;

      const channelTypeFinalMatch =
        selectedChannelTypeFinal === "All" ||
        getChannelTypeFinalVal(r) ===
          selectedChannelTypeFinal;

      return (
        teamMatch &&
        yearMatch &&
        stageMatch &&
        channelTypeFinalMatch
      );
    });

    const platforms = [
      ...new Set(
        baseRows
          .map((r) => cleanValue(r.Platform))
          .filter(Boolean)
      ),
    ];

    return platforms
      .map((platform) => {
        const rows = baseRows.filter(
          (r) => cleanValue(r.Platform) === platform
        );

        return {
          platform,
          avg: Math.round(
            avg(
              rows.map((r) =>
                toNumber(r.Avg_Viewers)
              )
            )
          ),
          n: rows.length,
        };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [
    data,
    selectedTeam,
    selectedYear,
    selectedStage,
    selectedChannelTypeFinal,
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
          justifyContent: "center",
        }}
      >
        Google Sheets 데이터를 불러오는 중...
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
        }}
      >
        {error}
      </div>
    );
  }

  // ==========================================================
  // Render
  // ==========================================================
  return (
    <div
      style={{
        background: BG,
        minHeight: "100vh",
        color: "#E5E7F0",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "28px 24px 60px",
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 18,
            gap: 20,
            flexWrap: "wrap",
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
              LCK VIEWERSHIP (2025 전체 · 2026 상반기)
            </div>

            <h1
              style={{
                fontSize:
                  "clamp(22px, 4vw, 30px)",
                fontWeight: 800,
                margin: 0,
                letterSpacing: -0.5,
                color: "#FAFAFC",
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
            Interactive Dashboard (Dynamic Cascading Active)
            <br />
            2025년 전체 시즌 · 2026년 상반기(Road to MSI까지) LCK · Worlds · MSI 통합 데이터 기준
          </div>
        </div>

        {/* FILTER BAR */}
        <div
          style={{
            background: PANEL,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: 16,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
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
              FILTERS (완전 교차 종속 필터링 적용)
            </div>

            <button
              onClick={resetFilters}
              style={{
                background: "transparent",
                border: `1px solid ${BORDER}`,
                color: TEXT_DIM,
                borderRadius: 4,
                padding: "5px 10px",
                fontSize: 11,
                cursor: "pointer",
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
              value={selectedYear}
              options={dynamicFilterOptions.years}
              onChange={setSelectedYear}
            />

            <FilterSelect
              label="Stage"
              value={selectedStage}
              options={dynamicFilterOptions.stages}
              onChange={setSelectedStage}
            />

            <FilterSelect
              label="Team"
              value={selectedTeam}
              options={dynamicFilterOptions.teams}
              onChange={setSelectedTeam}
            />

            <FilterSelect
              label="Platform"
              value={selectedPlatform}
              options={dynamicFilterOptions.platforms}
              onChange={setSelectedPlatform}
            />

            <FilterSelect
              label="Channel Type"
              value={selectedChannelTypeFinal}
              options={
                dynamicFilterOptions.channelTypeFinals
              }
              onChange={setSelectedChannelTypeFinal}
            />
          </div>
        </div>

        {/* TEAM INSIGHT NOTE CARD */}
        {selectedTeam !== "All" &&
          TEAM_NOTES[selectedTeam] && (
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
              }}
            >
              <div
                style={{
                  background:
                    "rgba(212, 175, 55, 0.15)",
                  color: GOLD,
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "4px 8px",
                  borderRadius: 4,
                  fontFamily:
                    "ui-monospace, monospace",
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
                  }}
                >
                  {selectedTeam}{" "}
                  <span
                    style={{
                      fontSize: 12,
                      color: TEXT_DIM,
                      fontWeight: 400,
                    }}
                  >
                    ({TEAM_NOTES[selectedTeam].nameKo})
                    데이터 분석 노트
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

        {/* TEAM SCOREBOARD */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            padding: "0 0 22px",
            borderBottom: `1px solid ${BORDER}`,
            marginBottom: 28,
          }}
        >
          {TEAM_SUMMARY.map((t) => {
            const active = t.team === selectedTeam;
            const gold = isGenG(t.team);

            return (
              <button
                key={t.team}
                onClick={() =>
                  setSelectedTeam(t.team)
                }
                style={{
                  flex: "0 0 auto",
                  cursor: "pointer",
                  textAlign: "left",
                  background: active
                    ? gold
                      ? "rgba(212,175,55,0.14)"
                      : "rgba(255,255,255,0.06)"
                    : "transparent",
                  border: `1px solid ${
                    active
                      ? gold
                        ? GOLD
                        : "#4A4D63"
                      : BORDER
                  }`,
                  borderRadius: 6,
                  padding: "8px 12px",
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
                    whiteSpace: "nowrap",
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
          })}
        </div>

        {/* HERO / KPI */}
        <div
          style={{
            display: "flex",
            gap: 32,
            flexWrap: "wrap",
            marginBottom: 40,
            background: PANEL,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "24px 28px",
          }}
        >
          <StatBlock
            label={
              selectedTeam === "All"
                ? "전체 구단"
                : `${selectedTeam} 순위`
            }
            value={
              selectedTeam === "All"
                ? "—"
                : selectedTeamData.rank
                ? `${selectedTeamData.rank} / ${TEAM_SUMMARY.length}`
                : "-"
            }
            sub="현재 필터 기준"
            accent={
              isGenG(selectedTeamData.team)
                ? GOLD
                : "#F2F3F7"
            }
          />

          <StatBlock
            label="평균 동시시청자"
            value={
              selectedTeamData.avg > 0
                ? fmt(selectedTeamData.avg)
                : "-"
            }
            sub="현재 필터 기준"
            accent={
              isGenG(selectedTeamData.team)
                ? GOLD
                : "#F2F3F7"
            }
          />

          <StatBlock
            label="최고 동시시청자"
            value={
              selectedTeamData.peak > 0
                ? fmt(selectedTeamData.peak)
                : "-"
            }
            sub="현재 필터 기준"
            accent={
              isGenG(selectedTeamData.team)
                ? GOLD
                : "#F2F3F7"
            }
          />

          <StatBlock
            label="리그평균 대비"
            value={
              selectedTeam === "All"
                ? "0.0%"
                : selectedTeamData.rank
                ? `${
                    selectedTeamData.vsLeague > 0
                      ? "+"
                      : ""
                  }${selectedTeamData.vsLeague}%`
                : "-"
            }
            sub={
              selectedTeam === "All"
                ? "전체 구단 평균 기준"
                : "현재 필터 기준"
            }
            accent={
              selectedTeam === "All"
                ? GREEN
                : selectedTeamData.vsLeague >= 0
                ? GREEN
                : RED
            }
          />
        </div>

        {/* 01 TEAM RANKING */}
        <SectionLabel
          index="01"
          title="구단별 시청자 순위 (공식 풀네임)"
        />

        <div
          style={{
            background: PANEL,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "20px 20px 8px",
            marginBottom: 40,
          }}
        >
          {TEAM_SUMMARY.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={390}
            >
              <BarChart
                data={TEAM_SUMMARY}
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
                  content={<CustomTooltip />}
                  cursor={{
                    fill: "rgba(255,255,255,0.03)",
                  }}
                />

                <Bar
                  dataKey="avg"
                  name="평균 동시시청자"
                  radius={[0, 4, 4, 0]}
                >
                  {TEAM_SUMMARY.map((d, i) => (
                    <Cell
                      key={i}
                      fill={
                        isGenG(d.team)
                          ? GOLD
                          : SLATE
                      }
                    />
                  ))}

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
                alignItems: "center",
                justifyContent: "center",
                color: TEXT_DIM,
                fontSize: 13,
              }}
            >
              선택한 조건에 해당하는 데이터가 없습니다.
            </div>
          )}
        </div>

        {/* 02 HALF-YEAR */}
        <SectionLabel
          index="02"
          title="상반기 동일기간 비교 (2025 상반기 vs 2026 상반기)"
        />

        <div
          style={{
            background: PANEL,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "20px 20px 8px",
            marginBottom: 40,
          }}
        >
          <ResponsiveContainer
            width="100%"
            height={340}
          >
            <BarChart
              data={HALF_YEAR_COMPARE}
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
                content={<CustomTooltip />}
                cursor={{
                  fill: "rgba(255,255,255,0.03)",
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
                radius={[3, 3, 0, 0]}
              >
                {HALF_YEAR_COMPARE.map(
                  (d, i) => (
                    <Cell
                      key={i}
                      fill={
                        isGenG(d.team)
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
                radius={[3, 3, 0, 0]}
              >
                {HALF_YEAR_COMPARE.map(
                  (d, i) => (
                    <Cell
                      key={i}
                      fill={
                        isGenG(d.team)
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

        {/* 03 TREND */}
        <SectionLabel
          index="03"
          title="연도별 상반기 전체 시청자 트렌드"
        />

        <div
          style={{
            background: PANEL,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "20px 20px 8px",
            marginBottom: 40,
          }}
        >
          {YEARLY_TREND.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={240}
            >
              <LineChart
                data={YEARLY_TREND}
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
                  tick={{
                    fill: TEXT_DIM,
                    fontSize: 11,
                  }}
                  tickFormatter={(v) =>
                    `${Math.round(
                      Number(v) / 1000
                    )}k`
                  }
                  width={50}
                />

                <Tooltip
                  content={<CustomTooltip />}
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
                alignItems: "center",
                justifyContent: "center",
                color: TEXT_DIM,
                fontSize: 13,
              }}
            >
              선택한 조건에 해당하는 데이터가 없습니다.
            </div>
          )}
        </div>

        {/* 04 STAGE */}
        <SectionLabel
          index="04"
          title={`대회 유형별 시청자 — ${stageRow.team}`}
        />

        <div
          style={{
            background: PANEL,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "20px 20px 8px",
            marginBottom: 40,
          }}
        >
          {stageChartData.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={320}
            >
              <BarChart
                data={stageChartData}
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
                  content={<CustomTooltip />}
                  cursor={{
                    fill: "rgba(255,255,255,0.03)",
                  }}
                />

                <Bar
                  dataKey="value"
                  name="평균 동시시청자"
                  radius={[3, 3, 0, 0]}
                  fill={
                    isGenG(stageRow.team)
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
                alignItems: "center",
                justifyContent: "center",
                color: TEXT_DIM,
                fontSize: 13,
              }}
            >
              선택한 조건에 해당하는 데이터가 없습니다.
            </div>
          )}
        </div>

        {/* 05 + 06 */}
        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          {/* 05 */}
          <div style={{ flex: "1 1 460px" }}>
            <SectionLabel
              index="05"
              title={`${stageRow.team} 최고 흥행 경기 TOP 5`}
            />

            <div
              style={{
                background: PANEL,
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {TOP5.length > 0 ? (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12.5,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: `1px solid ${BORDER}`,
                      }}
                    >
                      {[
                        "날짜",
                        "단계",
                        "최고 시청자",
                        "평균 시청자",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "10px 14px",
                            color: TEXT_DIM,
                            fontWeight: 500,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {TOP5.map((m, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom:
                            i <
                            TOP5.length - 1
                              ? `1px solid ${BORDER}`
                              : "none",
                        }}
                      >
                        <td
                          style={{
                            padding:
                              "10px 14px",
                            color: "#E5E7F0",
                          }}
                        >
                          {m.date
                            ? String(
                                m.date
                              ).slice(0, 10)
                            : "-"}
                        </td>

                        <td
                          style={{
                            padding:
                              "10px 14px",
                            color: TEXT_DIM,
                          }}
                        >
                          {m.tag}
                        </td>

                        <td
                          style={{
                            padding:
                              "10px 14px",
                            color: GOLD,
                            fontFamily:
                              "ui-monospace, monospace",
                          }}
                        >
                          {fmt(m.peak)}
                        </td>

                        <td
                          style={{
                            padding:
                              "10px 14px",
                            color: TEXT_DIM,
                            fontFamily:
                              "ui-monospace, monospace",
                          }}
                        >
                          {fmt(m.avg)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div
                  style={{
                    padding: 40,
                    textAlign: "center",
                    color: TEXT_DIM,
                    fontSize: 13,
                  }}
                >
                  선택한 조건에 해당하는 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* 06 */}
          <div style={{ flex: "1 1 420px" }}>
            <SectionLabel
              index="06"
              title={`${stageRow.team} 플랫폼별 성과`}
            />

            <div
              style={{
                background: PANEL,
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: "20px 20px 8px",
              }}
            >
              {PLATFORM_DATA.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height={240}
                >
                  <BarChart
                    data={PLATFORM_DATA}
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
                        fill: "#E5E7F0",
                        fontSize: 11.5,
                      }}
                      width={70}
                    />

                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        fill: "rgba(255,255,255,0.03)",
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
                        selectedTeam === "All"
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: TEXT_DIM,
                    fontSize: 13,
                  }}
                >
                  선택한 조건에 해당하는 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTNOTE */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 16,
            borderTop: `1px solid ${BORDER}`,
            fontSize: 11.5,
            color: TEXT_DIM,
            lineHeight: 1.8,
          }}
        >
          2025년 전체 시즌 · 2026년 상반기(Road to MSI까지) LCK · Worlds · MSI 통합 데이터 기준
          <br />
          모든 수치는 연결된 Google Sheets 실시간 데이터를 기준으로 자동 계산되며, 교차 종속 필터링이 적용됩니다.
        </div>
      </div>
    </div>
  );
}
```
