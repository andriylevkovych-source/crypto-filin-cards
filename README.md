# Crypto Filin — аналитические картинки

GitHub Actions по расписанию рисует фирменные картинки для канала @Filin1Radar
и кладёт их в папку `out/`. Make забирает их по прямой ссылке
`https://raw.githubusercontent.com/<логин>/crypto-filin-cards/main/out/<имя>.png`
и отправляет черновик в «Редакцию».

| Картинка | Файл | Когда (Киев) | Источники |
|---|---|---|---|
| Утренняя карточка рынка | `out/daily.png` | ежедневно 07:45 (к утреннему дайджесту 09:00) | CoinGecko, alternative.me, ForexFactory |
| Потоки в биткоин-ETF | `out/etf.png` | вт–сб 07:40 | TFTC / SoSoValue |
| Открытый интерес и фандинг | `out/deriv.png` | ежедневно 12:30 | CoinGecko Derivatives |
| Итоги недели | `out/weekly.png` | воскресенье 17:00 | CoinGecko, DefiLlama |

Рядом с каждой картинкой лежит `.json` с цифрами — по нему ИИ в Make пишет текст поста.

Ручной запуск: Actions → render-cards → Run workflow.
Локальный предпросмотр без интернета: `npm run mock`.
