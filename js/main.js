const DATA_PATH = "data/Austin_Animal_Center_Outcomes__10_01_2013_to_05_05_2025_.csv";

const state = {
    animal: "All",
    outcome: "All",
    maxAge: 20,
    selectedId: null,
    selectedMonth: null
};

const chartContainer = d3.select("#chart");
const tooltip = d3.select("#tooltip");
const ageValue = d3.select("#ageValue");

const statTotal = d3.select("#stat-total");
const statAdoption = d3.select("#stat-adoption");
const statDogs = d3.select("#stat-dogs");
const statCats = d3.select("#stat-cats");

const detailList = d3.select("#detailList");

const AXIS_TICK_SIZE = "0.85rem";
const AXIS_LABEL_SIZE = "0.95rem";

const chartWidth = 980;
const chartHeight = 660;
const margin = { top: 30, right: 30, bottom: 85, left: 190 };
const innerWidth = chartWidth - margin.left - margin.right;
const innerHeight = chartHeight - margin.top - margin.bottom;

const svg = chartContainer
    .append("svg")
    .attr("viewBox", `0 0 ${chartWidth} ${chartHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

const root = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const gridLayer = root.append("g").attr("class", "grid");
const marksLayer = root.append("g").attr("class", "marks");

const xScale = d3.scaleSqrt()
    .domain([0, 20])
    .range([0, innerWidth]);

const yScale = d3.scalePoint()
    .domain(["Other", "Euthanasia", "Return to Owner", "Transfer", "Adoption"])
    .range([innerHeight, 60])
    .padding(0.5);

const xAxisGroup = root.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`);

const yAxisGroup = root.append("g")
    .attr("class", "axis");

root.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 64)
    .attr("text-anchor", "middle")
    .style("font-size", AXIS_LABEL_SIZE)
    .text("Age upon Outcome (years)");

root.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -130)
    .attr("text-anchor", "middle")
    .style("font-size", AXIS_LABEL_SIZE)
    .text("Specific Outcome Type");

// ===== TREND CHART SETUP =====
const trendContainer = d3.select("#trendChart");
const clearMonthButton = d3.select("#clearMonth");

const trendWidth = chartWidth;
const trendHeight = 270;
const trendMargin = { top: 42, right: 30, bottom: 55, left: 130 };
const trendInnerWidth = trendWidth - trendMargin.left - trendMargin.right;
const trendInnerHeight = trendHeight - trendMargin.top - trendMargin.bottom;

let trendSvg = null;
let trendRoot = null;

if (!trendContainer.empty()) {
    trendSvg = trendContainer
        .append("svg")
        .attr("viewBox", `0 0 ${trendWidth} ${trendHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    trendRoot = trendSvg.append("g")
        .attr("transform", `translate(${trendMargin.left},${trendMargin.top})`);
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const xTrendScale = d3.scalePoint()
    .domain(d3.range(12))
    .range([0, trendInnerWidth])
    .padding(0.5);

const yTrendScale = d3.scaleLinear()
    .range([trendInnerHeight - 10, 20]);

function convertAgeToYears(ageText) {
    if (!ageText || !ageText.trim()) return null;

    const t = ageText.toLowerCase().trim();
    const value = parseFloat(t);

    if (Number.isNaN(value)) return null;
    if (t.includes("year")) return value;
    if (t.includes("month")) return value / 12;
    if (t.includes("week")) return value / 52;
    if (t.includes("day")) return value / 365;
    return null;
}

function getOutcomeGroup(outcomeType) {
    if (["Adoption", "Transfer", "Return to Owner", "Euthanasia"].includes(outcomeType)) {
        return outcomeType;
    }
    return "Other";
}

function getEmoji(type) {
    return type === "Dog" ? "🐶" : type === "Cat" ? "🐱" : "🐾";
}

function formatDate(dateText) {
    const date = new Date(dateText);
    if (Number.isNaN(date.getTime())) return dateText || "—";
    return date.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function shortText(value, fallback = "—") {
    return value && String(value).trim() ? value : fallback;
}

function setSegmentActive(containerId, value) {
    d3.selectAll(`${containerId} .segment`)
        .classed("active", false);

    d3.select(`${containerId} .segment[data-value="${value}"]`)
        .classed("active", true);
}

function stableJitter(id) {
    const text = String(id || "");
    let hash = 0;

    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }

    return (((hash % 1000) + 1000) % 1000) / 1000;
}

function isMonthSelected(month) {
    return state.selectedMonth === month;
}

function toggleMonth(month) {
    state.selectedMonth = state.selectedMonth === month ? null : month;
}

function handleMonthSelection(event, d) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    toggleMonth(d.month);
    renderAll();
}

function parsePetColor(colorStr) {
    if (!colorStr) return "#f0f0f0";

    const str = colorStr.toLowerCase();
    const colors = [];

    if (str.includes("black")) colors.push("#333333");
    if (str.includes("white")) colors.push("#ffffff");
    if (str.includes("brown")) colors.push("#8b4513");
    if (str.includes("chocolate")) colors.push("#d2691e");
    if (str.includes("tan") || str.includes("fawn")) colors.push("#d2b48c");
    if (str.includes("orange") || str.includes("red") || str.includes("apricot")) colors.push("#ff8c00");
    if (str.includes("yellow") || str.includes("gold") || str.includes("buff")) colors.push("#ffd700");
    if (str.includes("gray") || str.includes("grey") || str.includes("silver") || str.includes("blue")) colors.push("#a9a9a9");

    if (str.includes("brindle")) return "repeating-linear-gradient(45deg, #5c4033, #5c4033 10px, #222 10px, #222 20px)";
    if (str.includes("tortie")) return "radial-gradient(circle at center, #333 30%, #d2691e 70%)";
    if (str.includes("calico")) return "conic-gradient(#fff 0deg 120deg, #ff8c00 120deg 240deg, #333 240deg 360deg)";
    if (str.includes("merle")) return "repeating-radial-gradient(circle, #a9a9a9, #a9a9a9 5px, #333 5px, #333 10px)";

    if (colors.length === 0) return "#e0e0e0";
    if (colors.length === 1) return colors[0];
    if (colors.length === 2) return `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
    if (colors.length >= 3) return `linear-gradient(135deg, ${colors[0]} 33%, ${colors[1]} 66%, ${colors[2]} 100%)`;

    return colors[0];
}

function renderDetailCard(d) {
    const hero = d3.select(".detail-hero");

    if (!d) {
        hero.html(`
            <div style="display:flex; flex-direction:column; align-items:center; gap:12px; width:100%; text-align:center;">
                <div style="width:84px; height:84px; border-radius:50%; background:#f4f0f8; display:flex; align-items:center; justify-content:center; font-size:38px; box-shadow: inset 0 4px 8px rgba(0,0,0,0.05); color:#ccc;">✨</div>
                <div>
                    <h3 style="margin:0; font-size:1.25rem; color:#5b5269;">Explore Shelter Records</h3>
                    <p style="margin:4px 0 0; color:#8b8198; font-size:0.9rem;">Click any pet icon below</p>
                </div>
            </div>
        `);

        detailList.html(`
            <div class="detail-row" style="opacity:0.4;"><span>Status</span><strong>—</strong></div>
            <div class="detail-row" style="opacity:0.4;"><span>Type & Sex</span><strong>—</strong></div>
            <div class="detail-row" style="opacity:0.4;"><span>Age</span><strong>—</strong></div>
            <div class="detail-row" style="opacity:0.4;"><span>Color</span><strong>—</strong></div>
            <div class="detail-row" style="opacity:0.4;"><span>Date</span><strong>—</strong></div>
        `);
        return;
    }

    const bgValue = parsePetColor(d.color);
    const bgStyle = bgValue.includes("gradient")
        ? `background: ${bgValue};`
        : `background-color: ${bgValue};`;

    hero.html(`
        <div style="display:flex; align-items:center; gap:18px; width:100%;">
            <div style="width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:42px; border:4px solid white; box-shadow:0 8px 16px rgba(0,0,0,0.12); flex-shrink:0; ${bgStyle}">
                <span style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${getEmoji(d.animalType)}</span>
            </div>
            <div style="flex-grow:1; overflow:hidden;">
                <h3 style="margin:0; font-size:1.4rem; color:#4a4059; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">${shortText(d.name, `Unnamed ${d.animalType}`)}</h3>
                <p style="margin:4px 0 0; color:#857998; font-size:0.9rem; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;" title="${shortText(d.breed)}">${shortText(d.breed)}</p>
            </div>
        </div>
    `);

    detailList.html(`
        <div class="detail-row"><span>Status</span><strong style="color:#b25d7b; background:#fff0f5; padding:2px 8px; border-radius:12px;">${shortText(d.outcomeType)}</strong></div>
        <div class="detail-row"><span>Type & Sex</span><strong>${d.sex} ${d.animalType}</strong></div>
        <div class="detail-row"><span>Age</span><strong>${d.age.toFixed(1)} years</strong></div>
        <div class="detail-row"><span>Color</span><strong title="${shortText(d.color)}" style="max-width:120px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${shortText(d.color)}</strong></div>
        <div class="detail-row"><span>Date</span><strong>${formatDate(d.dateTime)}</strong></div>
    `);
}

function updateSummary(data) {
    const total = data.length;
    const adopted = data.filter(d => d.outcomeGroup === "Adoption").length;
    const dogs = data.filter(d => d.animalType === "Dog").length;
    const cats = data.filter(d => d.animalType === "Cat").length;
    const adoptionRate = total ? `${Math.round((adopted / total) * 100)}%` : "0%";

    statTotal.text(total.toLocaleString());
    statAdoption.text(adoptionRate);
    statDogs.text(dogs.toLocaleString());
    statCats.text(cats.toLocaleString());
}

function drawAxes() {
    xAxisGroup.call(
        d3.axisBottom(xScale)
            .ticks(8)
            .tickFormat(d => `${d}`)
    );

    yAxisGroup.call(d3.axisLeft(yScale));

    gridLayer.call(
        d3.axisLeft(yScale)
            .tickSize(-innerWidth)
            .tickFormat("")
    );

    xAxisGroup.selectAll("text").style("font-size", AXIS_TICK_SIZE);
    yAxisGroup.selectAll("text").style("font-size", AXIS_TICK_SIZE);
}

function computeMonthlyData(data) {
    return d3.range(12).map(month => {
        const subset = data.filter(d => d.month === month);
        const adopted = subset.filter(d => d.outcomeType === "Adoption").length;

        return {
            month,
            count: subset.length,
            adopted,
            rate: subset.length ? adopted / subset.length : 0
        };
    });
}

function drawTrendChart(data) {
    if (!trendRoot) return;

    const monthly = computeMonthlyData(data);
    yTrendScale.domain([0, 0.8]);
    trendRoot.selectAll("*").remove();

    const grid = trendRoot.append("g").attr("class", "trend-grid");
    grid.call(
        d3.axisLeft(yTrendScale)
            .tickValues([0, 0.2, 0.4, 0.6, 0.8])
            .tickSize(-trendInnerWidth)
            .tickFormat("")
    );

    const xAxis = trendRoot.append("g")
        .attr("transform", `translate(0,${trendInnerHeight})`)
        .call(d3.axisBottom(xTrendScale).tickFormat(d => monthNames[d]));

    const yAxis = trendRoot.append("g")
        .call(
            d3.axisLeft(yTrendScale)
                .tickValues([0, 0.2, 0.4, 0.6, 0.8])
                .tickFormat(d => `${Math.round(d * 100)}%`)
        );

    xAxis.selectAll("text").style("font-size", AXIS_TICK_SIZE);
    yAxis.selectAll("text").style("font-size", AXIS_TICK_SIZE);

    trendRoot.append("text")
        .attr("class", "axis-label")
        .attr("x", trendInnerWidth / 2)
        .attr("y", trendInnerHeight + 42)
        .attr("text-anchor", "middle")
        .style("font-size", AXIS_LABEL_SIZE)
        .text("Month in 2024");

    trendRoot.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -trendInnerHeight / 2)
        .attr("y", -72)
        .attr("text-anchor", "middle")
        .style("font-size", AXIS_LABEL_SIZE)
        .text("Adoption Rate");

    const lineGenerator = d3.line()
        .x(d => xTrendScale(d.month))
        .y(d => yTrendScale(d.rate))
        .curve(d3.curveMonotoneX);

    const areaGenerator = d3.area()
        .x(d => xTrendScale(d.month))
        .y0(trendInnerHeight)
        .y1(d => yTrendScale(d.rate))
        .curve(d3.curveMonotoneX);

    trendRoot.append("path")
        .datum(monthly)
        .attr("fill", "rgba(255, 183, 197, 0.18)")
        .attr("d", areaGenerator);

    trendRoot.append("path")
        .datum(monthly)
        .attr("fill", "none")
        .attr("stroke", "#d98aa2")
        .attr("stroke-width", 4)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round")
        .attr("d", lineGenerator);

    const monthBand = trendInnerWidth / 12;

    const monthHotspots = trendRoot.selectAll(".month-hotspot")
        .data(monthly)
        .enter()
        .append("g")
        .attr("class", "month-hotspot")
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            tooltip
                .classed("hidden", false)
                .html(`
                    <div><strong>${monthNames[d.month]}</strong></div>
                    <div>Adoption rate: ${Math.round(d.rate * 100)}%</div>
                    <div>Pets in view: ${d.count.toLocaleString()}</div>
                    <div>Adopted: ${d.adopted.toLocaleString()}</div>
                `)
                .style("left", `${event.clientX + 14}px`)
                .style("top", `${event.clientY + 14}px`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", `${event.clientX + 14}px`)
                .style("top", `${event.clientY + 14}px`);
        })
        .on("mouseout", function() {
            tooltip.classed("hidden", true);
        })
        .on("click", handleMonthSelection);

    monthHotspots.append("rect")
        .attr("class", "month-hitbox")
        .attr("x", d => xTrendScale(d.month) - monthBand / 2)
        .attr("y", 0)
        .attr("width", monthBand)
        .attr("height", trendInnerHeight)
        .attr("fill", d => isMonthSelected(d.month) ? "rgba(255, 111, 161, 0.14)" : "rgba(0,0,0,0.001)");

    const monthGroups = monthHotspots
        .append("g")
        .attr("class", "month-point")
        .attr("transform", d => `translate(${xTrendScale(d.month)},${yTrendScale(d.rate)})`);

    monthGroups.append("circle")
        .attr("r", d => isMonthSelected(d.month) ? 8 : 5.5)
        .attr("fill", d => isMonthSelected(d.month) ? "#ff6fa1" : "#ffffff")
        .attr("stroke", d => isMonthSelected(d.month) ? "#b25d7b" : "#d98aa2")
        .attr("stroke-width", d => isMonthSelected(d.month) ? 4 : 2.5)
        .style("filter", d => isMonthSelected(d.month)
            ? "drop-shadow(0 0 10px rgba(255, 111, 161, 0.45))"
            : "none");

    monthGroups.append("text")
        .attr("y", -22)
        .attr("text-anchor", "middle")
        .style("font-size", AXIS_TICK_SIZE)
        .style("font-weight", "800")
        .style("fill", "#8b8198")
        .text(d => d.count ? `${Math.round(d.rate * 100)}%` : "");

    if (!clearMonthButton.empty()) {
        clearMonthButton.style("opacity", state.selectedMonth === null ? 0.55 : 1);
    }
}

drawAxes();

let parsed = [];
let byId = new Map();

function getFilteredData() {
    return parsed.filter(d => {
        const animalOk = state.animal === "All" || d.animalType === state.animal;
        const outcomeOk =
            state.outcome === "All" ||
            (state.outcome === "Adoption" && d.outcomeType === "Adoption") ||
            (state.outcome === "Not Adopted" && d.outcomeType !== "Adoption");
        const ageOk = d.age <= state.maxAge;
        const monthOk = state.selectedMonth === null || d.month === state.selectedMonth;

        return animalOk && outcomeOk && ageOk && monthOk;
    });
}

function getTrendBaseData() {
    return parsed.filter(d => {
        const animalOk = state.animal === "All" || d.animalType === state.animal;
        const outcomeOk =
            state.outcome === "All" ||
            (state.outcome === "Adoption" && d.outcomeType === "Adoption") ||
            (state.outcome === "Not Adopted" && d.outcomeType !== "Adoption");
        const ageOk = d.age <= state.maxAge;

        return animalOk && outcomeOk && ageOk;
    });
}

function renderMainChart(filtered) {
    updateSummary(filtered);
    ageValue.text(state.maxAge);

    if (state.selectedId && !filtered.some(d => d.id === state.selectedId)) {
        state.selectedId = null;
        renderDetailCard(null);
    }

    const displayData = filtered.slice(0, 900).map(d => ({
        ...d,
        jitterX: xScale(d.age),
        jitterY: yScale(d.outcomeGroup) + (stableJitter(d.id) - 0.5) * 38
    }));

    const empty = marksLayer.selectAll(".empty-state")
        .data(filtered.length ? [] : [1]);

    empty.enter()
        .append("text")
        .attr("class", "empty-state")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight / 2)
        .attr("text-anchor", "middle")
        .text("No pets match the current filters.");

    empty.exit().remove();

    const marks = marksLayer
        .selectAll(".plot-icon")
        .data(displayData, d => d.id);

    marks.exit().remove();

    const marksEnter = marks.enter()
        .append("text")
        .attr("class", "plot-icon")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 24)
        .attr("x", d => xScale(d.age))
        .attr("y", d => yScale(d.outcomeGroup))
        .style("opacity", 0)
        .style("cursor", "pointer")
        .style("fill", d => d.animalType === "Dog" ? "#d98aa2" : "#89b5ec")
        .text(d => getEmoji(d.animalType));

    const merged = marksEnter.merge(marks);

    merged
        .classed("selected", d => d.id === state.selectedId)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .raise()
                .transition()
                .duration(100)
                .attr("font-size", d.id === state.selectedId ? 34 : 32);

            tooltip
                .classed("hidden", false)
                .html(`
                    <div><strong>${getEmoji(d.animalType)} ${shortText(d.name)}</strong></div>
                    <div>${d.animalType} • ${d.outcomeType}</div>
                    <div>Age: ${d.age.toFixed(2)} years</div>
                    <div>Breed: ${shortText(d.breed)}</div>
                    <div>Date: ${formatDate(d.dateTime)}</div>
                `)
                .style("left", `${event.clientX + 14}px`)
                .style("top", `${event.clientY + 14}px`);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", `${event.clientX + 14}px`)
                .style("top", `${event.clientY + 14}px`);
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .transition()
                .duration(100)
                .attr("font-size", d.id === state.selectedId ? 34 : 24);

            tooltip.classed("hidden", true);
        })
        .on("click", function(event, d) {
            state.selectedId = d.id;
            renderDetailCard(byId.get(d.id));
            renderAll();
        })
        .style("opacity", 0.95)
        .attr("x", d => d.jitterX)
        .attr("y", d => d.jitterY)
        .attr("font-size", d => d.id === state.selectedId ? 34 : 24)
        .style("fill", d => d.animalType === "Dog" ? "#d98aa2" : "#89b5ec")
        .text(d => getEmoji(d.animalType));

    if (!state.selectedId) {
        renderDetailCard(null);
    }
}

function renderAll() {
    const filtered = getFilteredData();
    const trendBase = getTrendBaseData();

    renderMainChart(filtered);
    drawTrendChart(trendBase);
}

d3.csv(DATA_PATH).then(raw => {
    parsed = raw
        .filter(d => {
            const dt = new Date(d["DateTime"]);
            return !Number.isNaN(dt.getTime()) && dt.getFullYear() === 2024;
        })
        .map(d => ({
            id: d["Animal ID"],
            name: shortText(d["Name"], "Unnamed"),
            animalType: d["Animal Type"],
            outcomeType: d["Outcome Type"],
            outcomeGroup: getOutcomeGroup(d["Outcome Type"]),
            sex: shortText(d["Sex upon Outcome"]),
            breed: shortText(d["Breed"]),
            color: shortText(d["Color"]),
            dateTime: d["DateTime"],
            month: new Date(d["DateTime"]).getMonth(),
            ageText: d["Age upon Outcome"],
            age: convertAgeToYears(d["Age upon Outcome"])
        }))
        .filter(d =>
            (d.animalType === "Dog" || d.animalType === "Cat") &&
            d.age !== null &&
            d.age >= 0 &&
            d.age <= 20
        );

    byId = new Map(parsed.map(d => [d.id, d]));

    d3.selectAll("#animal-toggle .segment").on("click", function() {
        state.animal = this.dataset.value;
        setSegmentActive("#animal-toggle", state.animal);
        renderAll();
    });

    d3.selectAll("#outcome-toggle .segment").on("click", function() {
        state.outcome = this.dataset.value;
        setSegmentActive("#outcome-toggle", state.outcome);
        renderAll();
    });

    d3.select("#ageRange").on("input", function() {
        state.maxAge = +this.value;
        renderAll();
    });

    if (!clearMonthButton.empty()) {
        clearMonthButton.on("click", function() {
            state.selectedMonth = null;
            renderAll();
        });
    }

    renderAll();
    renderDetailCard(null);
}).catch(err => {
    console.error(err);
    chartContainer.html(`<div style="padding:28px;font-weight:800;color:#b25d7b;">Failed to load the CSV. Check the file path and run with Live Server.</div>`);
});