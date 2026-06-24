# UI Chi tiết — Landing Page AutoWashPro

> **Route:** `/`
> **Component gốc:** `LandingPage.jsx`
> **Thứ tự section:** Navbar → Hero → HowItWorks → MapSection (Branches) → Testimonials → CTA → Footer

---

## 1. Navbar

### Vị trí & Layout
- **Position:** `fixed top-4 left-1/2 -translate-x-1/2 z-[5000]`
- **Style:** Floating pill navbar — `rounded-full border border-white/10 bg-white/70 backdrop-blur-xl`
- **Shadow:** `shadow-lg shadow-black/5`
- **Hide on scroll down, show on scroll up** (animation `y: -80 → 0`)

### Brand
- Icon SVG nhà (home) + text `AutoWashPro` (desktop) / `AWP` (mobile)
- Color: `text-emerald-600`, font bold

### Navigation Items
| Label | Route |
|-------|-------|
| Đặt lịch | `/booking` |
| Gói slot | `/packages` |
| Quà tặng | `/gifts` |
| Cửa hàng | `/map` |

- **Style:** `rounded-full px-3.5 py-2 text-xs md:text-sm font-medium text-neutral-600`
- **Hover:** `hover:bg-neutral-100 hover:text-neutral-900`

### Auth State
- **Đã đăng nhập:** Button hiện tên user + dropdown menu (Hồ sơ, Lịch sử, Thoát)
- **Chưa đăng nhập:** Button `Đăng nhập` — `rounded-full bg-neutral-900 text-white`

### Mobile
- Hamburger button hiện khi `md:hidden`
- Dropdown menu `rounded-2xl backdrop-blur-xl` chứa nav items

---

## 2. HeroSection

### Layout
- **Height:** `min-h-[80vh] md:min-h-screen`
- **Background:** Video background (canvas animation rain drops + bubbles)
- **Video:** `https://assets.mixkit.co/videos/47586/47586-720.mp4`
- **Overlay:** `bg-black/30` + canvas rain/bubble animation

### Content (centered, max-w-2xl)

#### Badge
- `inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm`
- Dot xanh lá `animate-pulse` + text *"Hệ thống đặt lịch thông minh"*

#### Heading
```html
<h1 class="text-[2rem] md:text-5xl lg:text-6xl tracking-tighter">
  Auto<span class="text-emerald-400">Wash</span><span class="text-white/40">Pro</span>
</h1>
```

#### Subtitle
- *"Đặt lịch rửa xe trực tuyến nhanh chóng tại các chi nhánh trên toàn quốc."*
- Color: `text-white/60 md:text-white/70`

#### CTA Buttons
| Button | Style | Action |
|--------|-------|--------|
| Bắt đầu ngay | `bg-emerald-500 text-white rounded-xl shadow-[0_4px_20px_-5px_rgba(16,185,129,0.4)]` | Navigate `/map` |
| Khám phá dịch vụ | `border border-white/30 bg-white/10 text-white backdrop-blur-sm` | Navigate `/booking` |

#### Stats
| Stat | Default | API source |
|------|---------|-----------|
| Lượt rửa | `15K+` | `stats.public.totalCompleted` |
| Hài lòng | `98.7%` | `stats.public.satisfactionRate` |
| Chi nhánh | `12` | `stats.public.totalBranches` |

- Layout: Flex center, gap `5 md:10`
- Text: `text-lg md:text-2xl font-bold text-white`

---

## 3. HowItWorksSection

### Layout
- **Background:** `bg-white`
- **Padding:** `py-24 md:py-32`
- **Container:** `max-w-6xl mx-auto px-6 md:px-12`

### Header
- Kicker: `CÁCH HOẠT ĐỘNG` — `text-emerald-600 text-xs font-semibold tracking-widest uppercase`
- Heading: *"Đặt lịch trong 4 bước"* — `text-3xl md:text-5xl tracking-tighter`
- Subtitle: *"Quy trình đơn giản, nhanh chóng..."*

### Steps Grid
- Layout: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8`

| Step | Number | Title | Description | Icon |
|------|--------|-------|-------------|------|
| 1 | 01 | Chọn chi nhánh | Chọn chi nhánh gần nhất phù hợp với vị trí | `location_on` |
| 2 | 02 | Chọn gói dịch vụ | Lựa chọn gói rửa từ cơ bản đến cao cấp | `grid_view` |
| 3 | 03 | Chọn xe & thời gian | Chọn xe đã lưu hoặc nhập thông tin xe mới | `schedule` |
| 4 | 04 | Xác nhận & nhận xe | Xác nhận đặt chỗ, áp dụng mã giảm giá | `add_circle` |

### Step Card
- **Container:** `p-8 bg-white border border-slate-200 rounded-2xl`
- **Hover:** `hover:shadow-2xl hover:shadow-emerald-100 hover:-translate-y-2`
- **Icon box:** `w-14 h-14 bg-emerald-100 rounded-xl` → hover: `bg-emerald-600 text-white`
- **Number:** `text-emerald-400 font-bold text-xs uppercase tracking-wider`
- **Title:** `text-xl font-semibold text-slate-900`
- **Description:** `text-slate-500 text-base leading-relaxed`
- **Animation:** Framer Motion fade-in + stagger delay

### CTA Button
- *"Đặt lịch ngay"* — `bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-200`
- Action: Navigate `/booking`

---

## 4. MapSection (Hệ thống chi nhánh)

### Layout
- **Background:** `bg-gradient-to-b from-slate-50 to-white`
- **Padding:** `py-24 md:py-32`
- **Container:** `max-w-[1200px] mx-auto px-6 md:px-12`

### Header
- Icon: `Building2` (lucide-react)
- Kicker: *"Hệ thống chi nhánh"*
- Heading: *"Tìm chi nhánh <span class='text-emerald-600'>gần bạn</span>"*
- Subtitle: *"{count} chi nhánh AutoWashPro trên toàn quốc..."*

### Search Bar
- **Container:** `max-w-xl mx-auto`
- **Input:** `pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200`
- **Icon:** `Search` (lucide-react) — `absolute left-4`
- **Clear button:** SVG ✕ — `absolute right-3`
- **Placeholder:** *"Tìm theo tên chi nhánh, địa chỉ hoặc SĐT..."*
- **Real-time search** trên `name`, `address`, `city`, `phone`

### City Filter Chips
- Layout: `flex flex-wrap items-center justify-center gap-2`
- **Active:** `bg-emerald-600 text-white shadow-md shadow-emerald-500/20`
- **Inactive:** `bg-white border border-slate-200 text-slate-500`
- Hiển thị count badge bên cạnh tên thành phố

### Stats Bar
- *"Hiển thị **{count}** chi nhánh tại **{city}**"*
- Nút *"Xóa bộ lọc"* hiện khi có filter active

### Branch Cards Grid
- Layout: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Animation: Framer Motion `AnimatePresence mode="popLayout"` — fade + slide

#### Branch Card
- **Container:** `rounded-2xl border bg-white p-5`
- **Hover:** `border-emerald-300 shadow-lg shadow-emerald-500/5 -translate-y-1`
- **Accent line:** `absolute bottom-0 h-0.5 bg-emerald-500` — hiện khi hover

| Element | Detail |
|---------|--------|
| Icon box | `w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100` + MapPin |
| City badge | `text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-full uppercase` |
| Name | `font-bold text-slate-800 text-base` → hover: `text-emerald-700` |
| Address | MapPin icon + text, `line-clamp-2` |
| Phone | Phone icon + text (nếu có) |
| Hours | Clock icon + text |
| CTA | *"Rửa xe ngay"* + ArrowRight icon |

### Loading State
- Spinner: `w-10 h-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500`
- Text: *"Đang tải danh sách chi nhánh..."*

### Empty State
- MapPin icon (48px, strokeWidth 1)
- Text: *"Không tìm thấy chi nhánh phù hợp."*
- Nút *"Xem tất cả chi nhánh"* — hiện khi filter active

### Bottom CTA Banner
- **Container:** `inline-flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm`
- Icon box: `w-10 h-10 rounded-xl bg-emerald-50` + Car icon
- Text: *"Đã chọn được chi nhánh?"* + *"Đặt lịch rửa xe chỉ trong 3 bước đơn giản."*
- Button: *"Đặt lịch ngay"* — `bg-emerald-600 text-white rounded-xl`

---

## 5. TestimonialsSection

### Layout
- **Background:** `bg-slate-50`
- **Padding:** `py-24 md:py-32`
- **Overflow:** Hidden (marquee)

### Header
- Kicker: *"KHÁCH HÀNG NÓI GÌ"*
- Heading: *"Hàng ngàn khách hàng hài lòng"*
- Subtitle: *"Những đánh giá chân thực từ khách hàng..."*

### Marquee System
- 2 rows chạy song song, chiều ngược nhau
- Row 1: `speed=35`, chiều trái → phải
- Row 2: `speed=45`, chiều phải → trái
- **Pause on hover:** `group-hover/row:[animation-play-state:paused]`

### Review Card
- **Width:** `w-[380px] shrink-0`
- **Container:** `p-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm`
- **Hover:** `hover:shadow-xl hover:shadow-emerald-50`

| Element | Detail |
|---------|--------|
| Star rating | 5 stars, `text-yellow-400` (Material Symbols) |
| Content | `text-slate-700 italic` trong dấu ngoặc kép |
| Avatar | `w-12 h-12 rounded-full` + initials |
| Name | `font-semibold text-slate-900` |
| Location | `text-xs text-slate-400` |

### Fallback Data (5 reviews)
| Name | Location | Content | Rating |
|------|----------|---------|--------|
| Lê Văn Cường | AutoWash Pro Thủ Đức | Dịch vụ tốt, đội ngũ chuyên nghiệp... | 5 |
| Phạm Thị Dung | AutoWash Pro Quận 1 | Rửa rất sạch, nhân viên nhiệt tình... | 5 |
| Nguyễn Văn An | AutoWash Pro Quận 7 | Công nghệ rửa tiên tiến, bảo vệ sơn... | 5 |
| Trần Minh Tuấn | AutoWash Pro Bình Thạnh | Ceramic coating rất ưng ý... | 5 |
| Hoàng Thị Mai | AutoWash Pro Tân Bình | Đặt lịch nhanh, rửa xe sạch... | 5 |

### Color Map
| Color | Avatar BG | Text |
|-------|-----------|------|
| emerald | `bg-emerald-100` | `text-emerald-700` |
| blue | `bg-blue-100` | `text-blue-700` |
| violet | `bg-violet-100` | `text-violet-700` |
| amber | `bg-amber-100` | `text-amber-700` |
| rose | `bg-rose-100` | `text-rose-700` |

---

## 6. CTASection

### Layout
- **Background:** Gradient `from-emerald-600 via-emerald-500 to-teal-500`
- **Pattern overlay:** SVG grid pattern `opacity-30`
- **Decorative circles:** 2 blur circles (trái + phải)
- **Padding:** `py-24 md:py-32`
- **Grid:** `grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center`

### Left Column — Content

#### Badge
- Icon: `Gift` (lucide-react)
- Text: *"Ưu đãi đặc biệt"* — `text-emerald-100`

#### Heading
```
Bắt đầu ngay
Sẵn sàng để xe bạn luôn sạch?
```
- `text-3xl md:text-5xl font-extrabold text-white`

#### Subtitle
- *"Đăng ký ngay để nhận ưu đãi lần đầu..."*
- Color: `text-emerald-100/80`

#### Features Grid (2×2)
| Feature | Icon | Color | BG |
|---------|------|-------|-----|
| Đặt lịch chỉ 30 giây | Zap | `text-amber-500` | `bg-amber-50` |
| Bảo vệ sơn xe chuẩn quốc tế | Shield | `text-blue-500` | `bg-blue-50` |
| Chọn giờ linh hoạt 24/7 | Clock | `text-emerald-500` | `bg-emerald-50` |
| Ưu đãi thành viên lên đến 15% | Gift | `text-violet-500` | `bg-violet-50` |

- Container: `bg-white/10 backdrop-blur-sm rounded-xl border border-white/10`

#### CTA Button
- *"Đăng ký miễn phí"* + ArrowRight icon
- Style: `px-8 py-4 rounded-2xl bg-white text-emerald-700 font-bold text-lg shadow-xl`
- Hover: `hover:shadow-2xl hover:scale-[1.02]`

#### Trust Text
- *"Miễn phí đăng ký, không cần thẻ tín dụng"*
- Color: `text-emerald-100/70`

### Right Column — Visual Card (desktop only)

#### Card Container
- `bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8`
- Glow effect: `bg-white/10 rounded-3xl blur-2xl scale-95`

#### Header
- Icon SVG layers + *"AutoWashPro"* + *"Hệ thống rửa xe thông minh"*

#### Stats (3 columns)
| Value | Label |
|-------|-------|
| 50K+ | Khách hàng |
| 50K+ | Lượt rửa |
| 4.9 | Đánh giá |

- Container: `bg-white/10 rounded-xl border border-white/10`

#### Trust Items (3)
| Item |
|------|
| Không cần thẻ tín dụng |
| Hủy miễn phí trước 2 tiếng |
| Hoàn tiền 100% nếu không hài lòng |

- Icon: `CheckCircle2` — `text-emerald-200`

#### Fake Notification
- Avatar: `TK` — `bg-emerald-400/30`
- Name: *"Trần Kim T."*
- Text: *"Vừa đặt lịch thành công 5 phút trước"*
- Badge: *"Mới"* — `bg-emerald-400/20`

---

## 7. Footer

### Layout
- **Background:** `bg-slate-50`
- **Border:** `border-t border-slate-200`
- **Padding:** `py-16`
- **Container:** `max-w-[1400px] mx-auto px-6 md:px-12`
- **Grid:** `grid grid-cols-1 md:grid-cols-4 gap-10`

### Brand Column (col-span-2)
- Logo: `Auto<span class='text-emerald-600'>Wash</span>Pro` — `text-xl font-bold`
- Description: *"Hệ thống đặt lịch rửa xe thông minh..."*

### Links Columns

#### Dịch vụ
- Rửa xe cơ bản
- Rửa xe cao cấp
- Phủ ceramic
- Vệ sinh nội thất

#### Hỗ trợ
- Trung tâm trợ giúp
- Liên hệ
- Điều khoản sử dụng
- Chính sách bảo mật

### Bottom Bar
- **Border:** `border-t border-slate-200`
- **Left:** `© {year} AutoWashPro. Mọi quyền được bảo lưu.`
- **Right:** Facebook, Instagram, YouTube — `text-slate-400 hover:text-slate-600`

---

## 8. Design System Summary

### Color Palette
| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#10b981` (Emerald 500) | Buttons, accents, active states |
| Primary Dark | `#059669` (Emerald 600) | CTAs, hover states |
| Primary Light | `rgba(16,185,129,0.04–0.12)` | Backgrounds |
| Text Primary | `#0f172a` (Slate 900) | Headings |
| Text Secondary | `#64748b` (Slate 500) | Body, descriptions |
| Text Muted | `#94a3b8` (Slate 400) | Hints, placeholders |
| Background | `#ffffff` / `#f8fafc` | Cards, sections |
| Border | `rgba(0,0,0,0.06)` / `#e2e8f0` | Card borders |

### Typography
| Element | Size | Weight |
|---------|------|--------|
| Hero heading | `2rem → 5xl → 6xl` | 800 |
| Section heading | `3xl → 5xl` | 800 |
| Card title | `text-base–xl` | 600–700 |
| Body | `text-sm–base` | 400 |
| Small/meta | `text-xs` | 400–500 |
| Kicker | `text-xs` | 600 |

### Spacing & Layout
| Element | Value |
|---------|-------|
| Section padding | `py-24 md:py-32` |
| Container max-width | `1200px / 1400px` |
| Card border-radius | `rounded-2xl` (16px) |
| Button border-radius | `rounded-xl` (12px) / `rounded-full` |
| Grid gap | `gap-4 → gap-6 → gap-8` |

### Animations
- **Framer Motion:** fade-in, slide-up, scale, layout animations
- **Scroll-triggered:** `useInView` with `once: true` + `margin: -80px to -100px`
- **Hover effects:** `translate-y`, `shadow-lg`, `scale-[1.02]`
- **Marquee:** CSS `@keyframes marquee-left/right` for testimonials
- **Canvas:** Rain drops + bubbles animation in Hero background

### API Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/stats/public` | Hero stats |
| GET | `/api/branches/public` | Branch list |
| GET | `/api/testimonials` | Customer reviews |

### Responsive Breakpoints
| Prefix | Width | Behavior |
|--------|-------|----------|
| Default | < 768px | Single column, stacked layout |
| `sm` | 640px+ | Side-by-side buttons |
| `md` | 768px+ | 2-column grids, larger text |
| `lg` | 1024px+ | 4-column steps, 3-column branches, 2-column CTA |
