/* ТАКТ — симулятор смены.
   Главное решение всего проекта: положение вагона — чистая функция времени,
   а не состояние, которое двигают кадр за кадром.

       положение = график(t − отклонение(t))

   То есть опаздывающий на 7 минут вагон находится там, где по расписанию
   должен был быть семь минут назад. Из этой одной строчки бесплатно следует:

   • перемотка назад работает сама собой — это просто другое t;
   • лента, графики и числа не могут разойтись между собой — у них одно t;
   • переход с лендинга в продукт не сбивает движение: новая страница
     считает позиции от того же t с точностью до кадра.

   Отклонение складывается из двух вещей: гладкого детерминированного шума
   (свой у каждого вагона, привязан к номеру — значит смена всегда одна и та же)
   и задержек от происшествий. Второе — не декорация: вагон реально стоит
   в точке перекрытия, пока диспетчер не закроет событие. */

window.TAKT = window.TAKT || {};

TAKT.simulator = (() => {
  const geometry = TAKT.geometry;
  const SERVICE_START = 360;      // 06:00, начало выпуска
  const ON_TIME_TOLERANCE = 2;    // ±2 минуты считаются графиком

  const lines = new Map();        // id → контекст линии
  const vehicles = [];            // рабочие объекты, переиспользуются каждый кадр
  const offline = [];
  let ready = false;

  /* ——— подготовка ——— */

  function init() {
    if (ready) return;
    const net = TAKT.network;

    for (const line of net.lines) {
      const d = geometry.roundedPath(line.nodes, net.cornerRadius);
      const track = geometry.sample(d);
      const stopNodes = line.nodes.filter(n => n.stop);
      const stopProgress = geometry.projectNodes(track, stopNodes);

      const crew = TAKT.fleet
        .filter(v => v.line === line.id)
        .sort((a, b) => a.tab - b.tab);

      const cycle = line.roundTripMin;
      const ctx = {
        line: line, d: d, track: track, cycle: cycle, half: cycle / 2,
        headway: cycle / crew.length,
        count: crew.length,
        stops: stopNodes.map((n, i) => ({
          name: n.stop, nameLat: n.lat || null, hub: !!n.hub, pos: n.labelPos || null,
          progress: stopProgress[i], x: n.x, y: n.y
        })),
        incidents: []
      };
      lines.set(line.id, ctx);

      crew.forEach((v, i) => {
        vehicles.push({
          ref: v, id: v.id, line: line.id, tab: v.tab, model: v.model,
          driver: v.driver, driverLat: v.driverLat || null,
          offset: i * ctx.headway,
          // поля ниже переписываются каждый кадр
          x: 0, y: 0, angle: 0, progress: 0, dir: 1,
          deviation: 0, status: 'ontime', heldSince: null, holdMin: 0,
          occupancy: 0, nextStop: '', nextStopLat: null, speedKmh: 0, incident: null
        });
      });
    }

    for (const v of TAKT.fleet) {
      if (!v.line) offline.push({ ref: v, id: v.id, model: v.model, depot: v.depot, reason: v.reason });
    }

    bindIncidents();
    ready = true;
  }

  /* Происшествие привязывается к перегону: из точки на схеме получаем
     прогресс вдоль линии. Дальше симулятор знает, где именно встанут вагоны. */
  function bindIncidents() {
    for (const inc of TAKT.incidents) {
      const ctx = lines.get(inc.line);
      if (!ctx) continue;
      inc.progressOnLine = geometry.progressAtPoint(ctx.track, inc.at.x, inc.at.y);
      ctx.incidents.push(inc);
    }
  }

  /* ——— отклонение от графика ——— */

  /* Час пик добавляет городу трения: та же неровность хода даёт больший разброс. */
  function peakFactor(t) {
    const morning = Math.exp(-Math.pow((t - 450) / 55, 2));   // около 07:30
    const evening = Math.exp(-Math.pow((t - 990) / 65, 2));   // около 16:30
    return 1 + 0.45 * morning + 0.5 * evening;
  }

  /* Гладкий шум: три синусоиды с фазами из номера вагона.
     Детерминирован — одна и та же смена при каждом открытии демо.

     friction — насколько линии мешает город: 43-я идёт по Пётрковской
     через нерегулируемые переезды и держится хуже всех, 46-я по
     обособленному полукольцу почти не сбивается. Отсюда разная
     пунктуальность линий в отчётах — она не нарисована, а вытекает. */
  function baseNoise(id, t, friction) {
    const a = Math.sin(t / 23.3 + id * 0.7) * 1.02;
    const b = Math.sin(t / 11.1 + id * 1.9) * 0.56;
    const c = Math.sin(t / 6.7 + id * 3.1) * 0.31;
    return (a + b + c) * peakFactor(t) * (friction || 1);
  }

  function incidentEnd(inc) {
    return inc.closedAt != null ? inc.closedAt : Infinity;
  }

  /* Когда вагон по расписанию оказывается в точке p — в обе стороны маршрута.
     Ищем первый такой момент после начала происшествия.

     dirOnly задаёт направление перекрытия: автомобиль на путях «в сторону
     центра» держит только один путь, встречный идёт свободно. Это не деталь
     ради детали — от неё зависит, встанет линия целиком или наполовину. */
  function firstPassAfter(ctx, veh, p, from, dirOnly) {
    const half = ctx.half, cycle = ctx.cycle;
    const phases = dirOnly === 1 ? [p * half]
                 : dirOnly === -1 ? [cycle - p * half]
                 : [p * half, cycle - p * half];
    let best = Infinity;
    for (const phase of phases) {
      const anchor = SERVICE_START - veh.offset + phase;
      const k = Math.ceil((from - anchor) / cycle);
      const t = anchor + k * cycle;
      if (t < best) best = t;
    }
    return best;
  }

  /* Задержка от происшествий. Возвращает удержание (вагон физически стоит)
     и накопленные минуты, которые потом рассасываются.

     Весь расчёт ведётся в «эффективном» времени tEff = t − шум. Если сравнивать
     момент подъезда с настоящим временем, вагон в секунду срабатывания
     перепрыгивает на точку блокировки: график считает его в одном месте,
     а удержание ставит в другое. В эффективной шкале обе ветки сходятся
     в одной точке, и вагон подъезжает к перекрытию, а не возникает на нём. */
  function incidentDelay(ctx, veh, t, tEff, out) {
    out.held = false; out.at = 0; out.since = 0; out.delay = 0; out.incident = null;

    for (const inc of ctx.incidents) {
      if (t < inc.start || !inc.blocking) continue;
      const end = incidentEnd(inc);
      const pass = firstPassAfter(ctx, veh, inc.progressOnLine, inc.start, inc.blockDirection);

      if (pass > tEff) continue;               // ещё не доехал до места

      if (tEff < end) {
        out.held = true;
        out.at = inc.progressOnLine;
        out.since = pass;
        out.delay += tEff - pass;
        out.incident = inc;
      } else {
        // После снятия перекрытия вагон нагоняет. Накопленное ограничено
        // двадцатью минутами: в жизни диспетчер не даёт вагону опоздать на
        // сорок — он укорачивает рейс или отправляет в оборот, и линия
        // возвращается в график за полчаса, а не за три часа.
        const accrued = Math.min(20, Math.max(0, end - pass));
        out.delay += accrued * Math.exp(-(tEff - end) / 16);
      }
    }
    return out;
  }

  /* ——— заполненность ——— */

  function occupancyAt(id, t) {
    const morning = Math.exp(-Math.pow((t - 445) / 60, 2)) * 58;
    const evening = Math.exp(-Math.pow((t - 985) / 70, 2)) * 52;
    const midday = 26 + Math.sin(t / 40 + id) * 7;
    const value = midday + morning + evening + Math.sin(t / 9 + id * 2.3) * 6;
    return Math.max(4, Math.min(99, Math.round(value)));
  }

  /* ——— основной расчёт ——— */

  const holdBuffer = { held: false, at: 0, since: 0, delay: 0, incident: null };
  const point = { x: 0, y: 0, angle: 0 };

  function update(t) {
    init();

    for (const veh of vehicles) {
      const ctx = lines.get(veh.line);
      const noise = baseNoise(veh.id, t, ctx.line.friction);
      const hold = incidentDelay(ctx, veh, t, t - noise, holdBuffer);
      const deviation = noise + hold.delay;

      veh.deviation = deviation;
      veh.occupancy = occupancyAt(veh.id, t);

      if (hold.held) {
        veh.progress = hold.at;
        veh.holdMin = hold.delay;
        veh.heldSince = hold.since;
        veh.status = 'stopped';
        veh.incident = hold.incident;
        veh.speedKmh = 0;
        // направление берём с момента подъезда, чтобы вагон не крутился на месте
        veh.dir = phaseOf(ctx, veh, hold.since) < ctx.half ? 1 : -1;
      } else {
        const phase = phaseOf(ctx, veh, t - deviation);
        veh.heldSince = null; veh.holdMin = 0; veh.incident = null;
        if (phase < ctx.half) { veh.dir = 1; veh.progress = phase / ctx.half; }
        else { veh.dir = -1; veh.progress = 1 - (phase - ctx.half) / ctx.half; }
        veh.status = deviation > ON_TIME_TOLERANCE ? 'late'
                   : deviation < -ON_TIME_TOLERANCE ? 'early' : 'ontime';
        const nominal = (ctx.line.lengthKm * 2) / (ctx.cycle / 60);
        veh.speedKmh = Math.round(nominal * (0.82 + 0.3 * Math.abs(Math.sin(t / 5 + veh.id))));
      }

      geometry.at(ctx.track, veh.progress, point);
      veh.x = point.x; veh.y = point.y;
      // едущий обратно вагон развёрнут: касательная всегда считается по ходу пути
      veh.angle = veh.dir === 1 ? point.angle : point.angle + 180;
      const next = nextStopOf(ctx, veh);
      veh.nextStop = next ? next.name : '';
      veh.nextStopLat = next ? next.nameLat : null;
    }
    return vehicles;
  }

  function phaseOf(ctx, veh, t) {
    const raw = (t - SERVICE_START + veh.offset) % ctx.cycle;
    return raw < 0 ? raw + ctx.cycle : raw;
  }

  /* Возвращаем саму остановку, а не строку: у названия два варианта —
     кириллицей и латиницей, и выбирать между ними должен интерфейс. */
  function nextStopOf(ctx, veh) {
    const stops = ctx.stops;
    if (veh.dir === 1) {
      for (let i = 0; i < stops.length; i++) {
        if (stops[i].progress > veh.progress + 0.004) return stops[i];
      }
      return stops[stops.length - 1];
    }
    for (let i = stops.length - 1; i >= 0; i--) {
      if (stops[i].progress < veh.progress - 0.004) return stops[i];
    }
    return stops[0];
  }

  /* ——— происшествия во времени ——— */

  /* Статус вычисляется от t, а не берётся из данных: перемотал на 07:00 —
     событие 07:42 ещё не произошло, и в ленте его нет. */
  function incidentStatusAt(inc, t) {
    if (t < inc.start) return null;
    if (inc.closedAt != null && t >= inc.closedAt) return 'closed';
    return inc.status === 'closed' ? 'working' : inc.status;
  }

  function incidentsAt(t) {
    const out = [];
    for (const inc of TAKT.incidents) {
      const status = incidentStatusAt(inc, t);
      if (!status) continue;
      out.push({
        inc: inc,
        status: status,
        minutes: t - inc.start,
        closed: status === 'closed',
        duration: inc.closedAt != null && status === 'closed'
          ? inc.closedAt - inc.start
          : t - inc.start
      });
    }
    out.sort((a, b) => b.inc.start - a.inc.start);
    return out;
  }

  /* ——— метрики смены ——— */

  function metrics(t) {
    let onTime = 0, active = 0, stopped = 0, late = 0, early = 0;
    for (const v of vehicles) {
      active++;
      if (v.status === 'ontime') onTime++;
      else if (v.status === 'stopped') stopped++;
      else if (v.status === 'late') late++;
      else if (v.status === 'early') early++;
    }

    /* Фактический интервал: стоящий вагон выпадает из расчёта, и разрыв
       между его соседями честно растёт. Именно это диспетчер и видит. */
    let headwaySum = 0, headwayCount = 0, worstGap = 0, worstLine = null;
    lines.forEach((ctx, id) => {
      let running = 0;
      for (const v of vehicles) if (v.line === id && v.status !== 'stopped') running++;
      if (running < 2) return;
      const lineHeadway = ctx.cycle / running;
      headwaySum += lineHeadway * running;
      headwayCount += running;
      if (lineHeadway > worstGap) { worstGap = lineHeadway; worstLine = id; }
    });

    let openIncidents = 0;
    for (const inc of TAKT.incidents) {
      const s = incidentStatusAt(inc, t);
      if (s && s !== 'closed') openIncidents++;
    }

    return {
      onLine: active,
      fleetTotal: TAKT.fleet.length,
      offline: offline.length,
      punctuality: active ? Math.round((onTime / active) * 100) : 0,
      avgHeadway: headwayCount ? headwaySum / headwayCount : 0,
      worstGap: worstGap, worstLine: worstLine,
      stopped: stopped, late: late, early: early, onTime: onTime,
      openIncidents: openIncidents
    };
  }

  /* Метрики одной линии — для панели экрана «Линия». */
  function lineMetrics(lineId) {
    const ctx = lines.get(lineId);
    const crew = vehicles.filter(v => v.line === lineId);
    const running = crew.filter(v => v.status !== 'stopped');
    let worst = null;
    for (const v of crew) if (!worst || v.deviation > worst.deviation) worst = v;
    const onTime = crew.filter(v => v.status === 'ontime').length;
    return {
      ctx: ctx,
      planned: ctx.headway,
      actual: running.length ? ctx.cycle / running.length : ctx.headway,
      worst: worst,
      punctuality: crew.length ? Math.round((onTime / crew.length) * 100) : 0,
      vehicles: crew
    };
  }

  /* Положение вагона в произвольный момент — нужно графику-нитке,
     который рисует всю смену сразу, а не только текущий кадр. */
  const probeBuffer = { held: false, at: 0, since: 0, delay: 0, incident: null };
  function progressAt(veh, ctx, t) {
    const noise = baseNoise(veh.id, t, ctx.line.friction);
    const hold = incidentDelay(ctx, veh, t, t - noise, probeBuffer);
    if (hold.held) return { progress: hold.at, deviation: noise + hold.delay, held: true };
    const deviation = noise + hold.delay;
    const phase = phaseOf(ctx, veh, t - deviation);
    const progress = phase < ctx.half ? phase / ctx.half : 1 - (phase - ctx.half) / ctx.half;
    return { progress: progress, deviation: deviation, held: false };
  }

  /* Какие вагоны задело происшествие и на сколько.
     Считается из той же модели, что и движение, — список в разборе
     не может разойтись с тем, что видно на карте. */
  function affectedBy(inc) {
    const ctx = lines.get(inc.line);
    if (!ctx || !inc.blocking) return [];
    const end = incidentEnd(inc);
    const out = [];
    for (const veh of vehicles) {
      if (veh.line !== inc.line) continue;
      const pass = firstPassAfter(ctx, veh, inc.progressOnLine, inc.start, inc.blockDirection);
      if (pass > end) continue;
      out.push({ veh: veh, from: pass, hold: Math.max(0, Math.min(end, pass + 90) - pass) });
    }
    return out.sort((a, b) => a.from - b.from);
  }

  return {
    init: init,
    update: update,
    affectedBy: affectedBy,
    get vehicles() { return vehicles; },
    get offline() { return offline; },
    get lines() { return lines; },
    line: id => lines.get(id),
    metrics: metrics,
    lineMetrics: lineMetrics,
    incidentsAt: incidentsAt,
    incidentStatusAt: incidentStatusAt,
    progressAt: progressAt,
    phaseOf: phaseOf,
    SERVICE_START: SERVICE_START,
    ON_TIME_TOLERANCE: ON_TIME_TOLERANCE
  };
})();
