import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Events & Amenities",
};

const HERO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDecX4FqgSKJW85HKIvZghmdSa6d6gpspHH9yId3dG6FNkUUYrHNrwbPPM0pFY8jdafWq_LEH8-RcVReUOL29Om30DhJRf7RkVaYlmoZEIF56peii-hldjfTpnMl6uNUeBYA88QWkdr1fPq-y41lEGY8Vj1ujdhC_ByTchVHsVGETf2j_2tiQiUR2k4byYmR2lJgxS7kahcFa-irrU9xP2EbZodykHKc-Goksw-jj8xFyDs1_sI1aY64GOVDyZOSCiFiCo7yWcV5Bt-";

const AMENITIES = {
  pool: "https://lh3.googleusercontent.com/aida-public/AB6AXuB0onJwl1L__Fewi1gZIuJo0ccHlbj8nzuFIGAQNaQMnjBaRG4pel9p5AsncyoiB-_86tfB4Hl2rmG_EO2I21Fev6BGfQB50wOj_Oe8u5rk36j-WrPi12dYwYpsVV0Y6WTPOOvHNMPkyG0HVmtJCZ0lBXxgA42zlax5XpZiaYW-wjM8iupox9zSImA_OWbbLeHPzDn9hXHZkd-qnKfXg_AuzVBmdhxIvZ3Nfboh8k6Umcwvdn-9SOUtcwbbzvkcjz9Q-B3mJcNELe6h",
  tennis:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA81dDgk9S5sEneNEZT-koAvu8T_vIyi5raBTq4_hXs3rUGwQou71o17yiFdNIku8GBWjdXZF7lg-OW0XVnADev16Jx_2etK2GIKu8O5-nQ4pAU4ju_RvbiOd5-s8EOFps77ILX2wVUIBAuMrPx-WjZ1n8Y_sy0xZej-Ym6AKrrfTCz9V8mG7Xlux3ZLLO48M9QAH5YXrZYq_Nr9284las6pgPOaKfcrRmEsc1U1pMeaOv2ItcwlJJyUzqtxaSO00n7XdzZSsun2Tql",
  clubhouse:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDUL4ZFT8CHj_5mdsk2x_kgZZfIBN5JQaDkMYZCQ8AxfvuDwpzN7mOBMok4tUjs1qkC9lCxGai0X01j2fd9cG4FWFVT_i2hE1thEZdtqSWq_zQLiKnG36A7A3OwuSpnDKb3moC4xDzLqOdYnuxcelQOYasVxiB-7nNTgnVUZDwsYTRW3FHwNDUKe2pa09A0E8oq7V75IKErr0GBwUKCYSOumsIsqdS2ndk2EDFXHz80TbtrR7LBD5NJ2Zl6SlXGAs-vXCRT5b1elGo-",
  trails:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDOSfV5rVOxB85R4q0HXrpD-7QJJMhR9Bictgnyn68HaKLH7yQt_tozkBX1uVlZCMEvzDs3XwTf04KcK7Ewy9jrvfPGeHQ4nnXhf75gDggkyEyG-zgvkTOswRUplD7WXS7XzjtzX8J-4c7e3Bp4zuIyf75kk8zU-K69Y3jl8J-vyWrXgshwvtHBIQ2WPcal8U2ZrIpRm_eyxRRsgDfn8kRrUVSnJgFCWz8H404goxUxbVXJJdBHbj_795fcqAmg3VsxR6bd1QywUxc1",
} as const;

const CTA_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAnQb1J594KMBIuoH41zRcWcSniD6N0Sak6JwYt_eirsmNEw0UJ-zmz5BGNTgECRHFC_FSAK5DRuNNN52zpzSHMmKJow6QlwWdHBBVjD3yo_TBNoYaEbiJHu-D_R_8K3py1TZprj91oDl9YifFBofv9luogsnqNARRhu98tXDJIbvl7qFaknG5A34-bb9p-vu4i2j5kh2MIjlRaZxBMNjThlfZqG0c_ek_DoPGOFYQfg8NGT7sg4z43IVV6UNiGH1w6XyXXkOZ5QfYp";

const EVENTS = [
  {
    day: "24",
    mon: "OCT",
    tag: "Social",
    tagClass:
      "text-on-tertiary-fixed-variant bg-tertiary-fixed px-2 py-0.5 rounded text-[9px] font-bold uppercase mb-2 inline-block",
    title: "Harvest Moon Garden Party",
    desc: "Join us for an evening of artisanal cider tasting and seasonal appetizers on the South Lawn.",
    time: "6:00 PM",
    place: "South Lawn",
  },
  {
    day: "02",
    mon: "NOV",
    tag: "Meeting",
    tagClass:
      "text-on-primary-fixed-variant bg-primary-fixed px-2 py-0.5 rounded text-[9px] font-bold uppercase mb-2 inline-block",
    title: "Quarterly Town Hall",
    desc: "Discussion on the 2025 landscape restoration project and security enhancement updates.",
    time: "7:30 PM",
    place: "Grand Hall",
  },
  {
    day: "15",
    mon: "NOV",
    tag: "Wellness",
    tagClass:
      "text-on-tertiary-fixed-variant bg-tertiary-fixed px-2 py-0.5 rounded text-[9px] font-bold uppercase mb-2 inline-block",
    title: "Morning Yoga by the Lake",
    desc: "A restorative session led by expert instructors. All skill levels are welcome.",
    time: "8:00 AM",
    place: "Lakefront Plaza",
  },
] as const;

export default function EventsPage() {
  return (
    <main className="min-h-screen">
      <section className="relative min-h-[614px] overflow-hidden flex items-center">
        <div className="absolute inset-0 z-0">
          <Image
            alt="Luxury community clubhouse with architectural lighting"
            className="object-cover"
            src={HERO}
            fill
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-[2px]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-8 w-full py-24">
          <div className="max-w-2xl">
            <span className="text-secondary-fixed tracking-[0.2em] font-bold uppercase mb-4 block text-sm">
              Curated Living
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6">
              Amenities &amp; <br />
              <span className="text-secondary-fixed">Gatherings</span>
            </h1>
            <p className="text-lg text-white/80 max-w-lg font-body">
              Experience the elevated lifestyle of Unity Grid Management. From
              pristine recreational facilities to exclusive community events.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24 px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-xl">
            <h2 className="text-3xl font-bold text-primary mb-4">
              World-Class Facilities
            </h2>
            <p className="text-on-surface-variant">
              Our amenities are designed to provide both sanctuary and social
              connection, maintained with meticulous attention to detail.
            </p>
          </div>
          <div className="hidden md:block h-px flex-grow mx-12 bg-outline-variant opacity-20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 group relative overflow-hidden rounded-xl bg-surface-container-low min-h-[500px]">
            <Image
              alt="Infinity swimming pool at sunset"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              src={AMENITIES.pool}
              fill
              sizes="(min-width: 768px) 66vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 p-10 text-white z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary-fixed-dim mb-2 block">
                Leisure
              </span>
              <h3 className="text-3xl font-bold mb-3">Azure Infinity Pool</h3>
              <p className="text-white/70 max-w-md">
                Heated year-round with private cabanas and a dedicated lap lane
                for early morning wellness.
              </p>
            </div>
          </div>
          <div className="md:col-span-4 group relative overflow-hidden rounded-xl bg-surface-container-low min-h-[500px]">
            <Image
              alt="Tennis courts with lush surroundings"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              src={AMENITIES.tennis}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 p-10 text-white z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary-fixed-dim mb-2 block">
                Athletics
              </span>
              <h3 className="text-2xl font-bold mb-3">The Racquet Club</h3>
              <p className="text-white/70">
                Four championship-grade courts with professional lighting for
                night play.
              </p>
            </div>
          </div>
          <div className="md:col-span-4 group relative overflow-hidden rounded-xl bg-surface-container-low min-h-[400px]">
            <Image
              alt="Modern clubhouse interior with luxury seating"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              src={AMENITIES.clubhouse}
              fill
              sizes="(min-width: 768px) 33vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 p-8 text-white z-10">
              <h3 className="text-xl font-bold mb-2">Grand Clubhouse</h3>
              <p className="text-white/70 text-sm">
                Elegant lounge spaces and professional kitchens available for
                private bookings.
              </p>
            </div>
          </div>
          <div className="md:col-span-8 group relative overflow-hidden rounded-xl bg-surface-container-low min-h-[400px]">
            <Image
              alt="Winding forest walking trails"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              src={AMENITIES.trails}
              fill
              sizes="(min-width: 768px) 66vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 p-8 text-white z-10">
              <h3 className="text-xl font-bold mb-2">Heritage Trails</h3>
              <p className="text-white/70 text-sm">
                Over 5 miles of meticulously maintained wooded trails for
                walking, jogging, and cycling.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low py-24">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-6">
            <div className="mb-8 md:mb-0">
              <h2 className="text-3xl font-bold text-primary mb-4">
                Upcoming Gatherings
              </h2>
              <p className="text-on-surface-variant max-w-md">
                Connect with your neighbors and stay informed about community
                decisions and social celebrations.
              </p>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 text-secondary font-bold text-sm tracking-wider uppercase group"
            >
              Sync to Calendar
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                calendar_add_on
              </span>
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-6">
              {EVENTS.map((e, i) => (
                <div
                  key={e.title}
                  className={`bg-surface-container-lowest p-6 rounded-lg flex gap-8 items-center transition-all hover:bg-white hover:shadow-[0_24px_48px_rgba(20,27,34,0.06)] ${
                    i === 0 ? "group" : ""
                  }`}
                >
                  <div className="shrink-0 text-center">
                    <span className="block text-secondary font-extrabold text-2xl">
                      {e.day}
                    </span>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {e.mon}
                    </span>
                  </div>
                  <div className="flex-grow min-w-0">
                    <span className={e.tagClass}>{e.tag}</span>
                    <h4 className="text-lg font-bold text-primary mb-1">
                      {e.title}
                    </h4>
                    <p className="text-sm text-on-surface-variant">{e.desc}</p>
                  </div>
                  <div className="hidden md:block text-right shrink-0">
                    <span className="block text-sm font-semibold text-primary">
                      {e.time}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      {e.place}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-1">
              <div className="sticky top-24 glass-panel bg-white/40 border border-white/40 p-8 rounded-xl">
                <h3 className="text-xl font-bold text-primary mb-6">
                  Amenity Status
                </h3>
                <div className="space-y-6">
                  {(
                    [
                      ["pool", "Azure Pool", "Open"],
                      ["fitness_center", "Fitness Center", "Open"],
                      ["sports_tennis", "Tennis Courts", "Open"],
                      ["meeting_room", "Clubhouse", "Private Event"],
                    ] as const
                  ).map(([icon, label, status]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="material-symbols-outlined text-secondary shrink-0">
                          {icon}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {label}
                        </span>
                      </div>
                      <span
                        className={
                          status === "Private Event"
                            ? "px-2 py-1 bg-surface-container-highest text-on-surface-variant text-[10px] font-bold uppercase rounded shrink-0"
                            : "px-2 py-1 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold uppercase rounded shrink-0"
                        }
                      >
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
                <hr className="my-8 border-outline-variant opacity-20" />
                <div className="bg-primary-container p-5 rounded-lg text-white">
                  <p className="text-xs uppercase tracking-widest font-bold mb-3 opacity-60">
                    Reserved Areas
                  </p>
                  <p className="text-sm mb-4">
                    Planning a private gathering? Residents can reserve the
                    clubhouse or garden terrace up to 6 months in advance.
                  </p>
                  <a
                    className="text-secondary-fixed text-sm font-bold flex items-center gap-2 hover:underline"
                    href="#"
                  >
                    Book Amenity{" "}
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 max-w-7xl mx-auto px-8">
        <div className="bg-primary rounded-2xl overflow-hidden relative min-h-[320px]">
          <div className="absolute inset-0 opacity-20">
            <Image
              alt=""
              aria-hidden
              className="object-cover"
              src={CTA_BG}
              fill
              sizes="100vw"
            />
          </div>
          <div className="relative z-10 px-12 py-16 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Experience the Estate Lifestyle
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto mb-10 text-lg">
              Maintenance schedules, payment options, and reservation forms are
              available via the resident services hub.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/payment"
                className="bg-secondary text-white px-8 py-3 rounded font-bold transition-all hover:bg-secondary-container hover:text-on-secondary-container"
              >
                Enter Resident Portal
              </Link>
              <Link
                href="/services"
                className="border border-white/20 text-white px-8 py-3 rounded font-bold hover:bg-white/10 transition-all"
              >
                View resident services
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
