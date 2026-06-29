import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner, Switch } from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { Button } from "../components/ui/Button";
import { api } from "../services/api";
import { SystemComponent, CreateThemeInput } from "../types";
import { useTranslation } from "../hooks/useTranslation";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { 
  FiInfo, 
  FiGrid, 
  FiPackage, 
  FiCheckCircle, 
  FiArrowLeft, 
  FiArrowRight, 
  FiPlus, 
  FiTrash2, 
  FiImage,
  FiFileText
} from "react-icons/fi";

export const CreateTheme: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [version, setVersion] = useState<string>("1.0.0");
  const [description, setDescription] = useState<string>("");
  const [author, setAuthor] = useState<string>("");
  const [license, setLicense] = useState<string>("MIT");
  const [homepage, setHomepage] = useState<string>("");

  // Components State
  const [selectedColorScheme, setSelectedColorScheme] = useState<string>("");
  const [selectedPlasmaStyle, setSelectedPlasmaStyle] = useState<string>("");
  const [selectedIconTheme, setSelectedIconTheme] = useState<string>("");
  const [selectedCursorTheme, setSelectedCursorTheme] = useState<string>("");
  const [selectedKvantumTheme, setSelectedKvantumTheme] = useState<string>("");
  const [selectedGtkTheme, setSelectedGtkTheme] = useState<string>("");
  const [wallpaperPath, setWallpaperPath] = useState<string>("");
  const [konsoleProfile, setKonsoleProfile] = useState<string>("");

  // Dependencies State
  const [depPackages, setDepPackages] = useState<string[]>([]);
  const [depFonts, setDepFonts] = useState<string[]>([]);
  const [depIcons, setDepIcons] = useState<string[]>([]);

  // Options State
  const [alsoPack, setAlsoPack] = useState<boolean>(false);

  // System Components Lists
  const [systemColorSchemes, setSystemColorSchemes] = useState<SystemComponent[]>([]);
  const [systemPlasmaStyles, setSystemPlasmaStyles] = useState<SystemComponent[]>([]);
  const [systemIconThemes, setSystemIconThemes] = useState<SystemComponent[]>([]);
  const [systemCursorThemes, setSystemCursorThemes] = useState<SystemComponent[]>([]);
  const [systemKvantumThemes, setSystemKvantumThemes] = useState<SystemComponent[]>([]);
  const [systemGtkThemes, setSystemGtkThemes] = useState<SystemComponent[]>([]);
  const [loadingComponents, setLoadingComponents] = useState<boolean>(false);

  // Load system components
  useEffect(() => {
    const fetchSystemComponents = async () => {
      setLoadingComponents(true);
      try {
        const [colors, plasma, icons, cursors, kvantum, gtk] = await Promise.all([
          api.listSystemColorSchemes(),
          api.listSystemPlasmaStyles(),
          api.listSystemIconThemes(),
          api.listSystemCursorThemes(),
          api.listSystemKvantumThemes(),
          api.listSystemGtkThemes(),
        ]);
        setSystemColorSchemes(colors);
        setSystemPlasmaStyles(plasma);
        setSystemIconThemes(icons);
        setSystemCursorThemes(cursors);
        setSystemKvantumThemes(kvantum);
        setSystemGtkThemes(gtk);
      } catch (err) {
        console.error("Failed to load system components", err);
        toast.error("Failed to load system components.");
      } finally {
        setLoadingComponents(false);
      }
    };

    fetchSystemComponents();
  }, []);

  // Auto slugify name when display name changes
  const handleDisplayNameChange = (val: string) => {
    setDisplayName(val);
    const slug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    setName(slug);
  };

  // Select Wallpaper Dialog
  const handleSelectWallpaper = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: "Images",
          extensions: ["png", "jpg", "jpeg", "webp"]
        }]
      });
      if (selected && typeof selected === "string") {
        setWallpaperPath(selected);
      }
    } catch (err) {
      toast.error("Error selecting image.");
    }
  };

  // Input Validation for Step 1
  const validateStep1 = (): boolean => {
    if (!displayName.trim()) {
      toast.error(t("create.form.validationNameRequired"));
      return false;
    }
    const nameRegex = /^[a-z0-9][a-z0-9-]{1,63}$/;
    if (!nameRegex.test(name)) {
      toast.error(t("create.form.validationNameFormat"));
      return false;
    }
    const semverRegex = /^\d+\.\d+\.\d+(\-[a-zA-Z0-9\.\-]+)?(\+[a-zA-Z0-9\.\-]+)?$/;
    if (!semverRegex.test(version)) {
      toast.error("Version must be in valid SemVer format (e.g., 1.0.0).");
      return false;
    }
    if (description.length > 200) {
      toast.error("Description cannot exceed 200 characters.");
      return false;
    }
    return true;
  };

  // Submit Handler
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const input: CreateThemeInput = {
        name,
        display_name: displayName || null,
        version,
        description: description || null,
        author: author || null,
        license: license || null,
        homepage: homepage || null,
        plasma_style: selectedPlasmaStyle || null,
        color_scheme: selectedColorScheme || null,
        icon_theme: selectedIconTheme || null,
        cursor_theme: selectedCursorTheme || null,
        kvantum_theme: selectedKvantumTheme || null,
        gtk_theme: selectedGtkTheme || null,
        wallpaper_path: wallpaperPath || null,
        konsole_profile: konsoleProfile || null,
        dep_packages: depPackages.length > 0 ? depPackages : null,
        dep_fonts: depFonts.length > 0 ? depFonts : null,
        dep_icons: depIcons.length > 0 ? depIcons : null,
        also_pack: alsoPack,
      };

      const result = await api.createTheme(input);
      toast.success(t("create.success"));
      navigate(`/installed/${result.theme_name}`);
    } catch (err: any) {
      toast.error(`${t("create.failed")}: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container page-container-narrow">
      <PageHeader 
        eyebrow={t("create.eyebrow")}
        title={t("create.title")} 
        subtitle={t("create.subtitle")} 
      />

      {/* Step Indicators */}
      <div className="flex justify-between items-center border-b border-hairline pb-4 mb-6">
        <div className={`flex flex-col items-center gap-1 flex-1 ${step >= 1 ? "text-ink" : "text-stone"}`}>
          <span className="type-micro-caps">{t("create.steps.step")} 1</span>
          <span className="type-body-strong">{t("create.steps.step1")}</span>
          <div className={`h-1 w-full mt-2 ${step >= 1 ? "bg-primary" : "bg-hairline"}`}></div>
        </div>
        <div className={`flex flex-col items-center gap-1 flex-1 ${step >= 2 ? "text-ink" : "text-stone"}`}>
          <span className="type-micro-caps">{t("create.steps.step")} 2</span>
          <span className="type-body-strong">{t("create.steps.step2")}</span>
          <div className={`h-1 w-full mt-2 ${step >= 2 ? "bg-primary" : "bg-hairline"}`}></div>
        </div>
        <div className={`flex flex-col items-center gap-1 flex-1 ${step >= 3 ? "text-ink" : "text-stone"}`}>
          <span className="type-micro-caps">{t("create.steps.step")} 3</span>
          <span className="type-body-strong">{t("create.steps.step3")}</span>
          <div className={`h-1 w-full mt-2 ${step >= 3 ? "bg-primary" : "bg-hairline"}`}></div>
        </div>
        <div className={`flex flex-col items-center gap-1 flex-1 ${step >= 4 ? "text-ink" : "text-stone"}`}>
          <span className="type-micro-caps">{t("create.steps.step")} 4</span>
          <span className="type-body-strong">{t("create.steps.step4")}</span>
          <div className={`h-1 w-full mt-2 ${step >= 4 ? "bg-primary" : "bg-hairline"}`}></div>
        </div>
      </div>

      {/* Step Contents */}
      {step === 1 && (
        <div className="card-flat space-y-6">
          <CardSectionHeader title={t("create.form.themeInfo")} icon={<FiInfo size={15} />} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 -mt-2">
            <div className="form-field-group">
              <span className="type-meta text-stone">{t("create.form.displayName")}</span>
              <input
                type="text"
                placeholder={t("create.form.displayNamePlaceholder")}
                value={displayName}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                className="form-field-input"
              />
            </div>

            <div className="form-field-group">
              <span className="type-meta text-stone">{t("create.form.identifier")}</span>
              <input
                type="text"
                placeholder={t("create.form.identifierPlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-field-input"
              />
              <span className="type-meta text-stone mt-1">{t("create.form.identifierHelp")}</span>
            </div>

            <div className="form-field-group">
              <span className="type-meta text-stone">{t("create.form.version")}</span>
              <input
                type="text"
                placeholder={t("create.form.versionPlaceholder")}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="form-field-input"
              />
            </div>

            <div className="form-field-group">
              <span className="type-meta text-stone">{t("create.form.author")}</span>
              <input
                type="text"
                placeholder={t("create.form.authorPlaceholder")}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="form-field-input"
              />
            </div>

            <div className="form-field-group sm:col-span-2">
              <span className="type-meta text-stone">{t("create.form.description")}</span>
              <textarea
                maxLength={200}
                placeholder={t("create.form.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-field-input min-h-[80px] py-2"
              />
              <div className="flex justify-between type-meta text-stone mt-1">
                <span>Description length:</span>
                <span>{description.length}/200</span>
              </div>
            </div>

            <div className="form-field-group">
              <span className="type-meta text-stone">License</span>
              <select
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                className="form-field-input"
              >
                <option value="MIT">MIT</option>
                <option value="GPL-3.0">GPL-3.0</option>
                <option value="Apache-2.0">Apache-2.0</option>
                <option value="Proprietary">Proprietary / Custom</option>
              </select>
            </div>

            <div className="form-field-group">
              <span className="type-meta text-stone">Homepage (Website)</span>
              <input
                type="url"
                placeholder="https://github.com/..."
                value={homepage}
                onChange={(e) => setHomepage(e.target.value)}
                className="form-field-input"
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card-flat space-y-6">
          <CardSectionHeader title={t("create.review.components")} icon={<FiGrid size={15} />} />

          {loadingComponents ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Spinner size="md" className="text-ink" />
              <span className="type-meta text-stone">{t("create.placeholders.loading")}</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 -mt-2">
              <div className="form-field-group">
                <span className="type-meta text-stone">{t("create.form.colorScheme")}</span>
                <select
                  value={selectedColorScheme}
                  onChange={(e) => setSelectedColorScheme(e.target.value)}
                  className="form-field-input"
                >
                  <option value="">{t("create.placeholders.ignore")}</option>
                  {systemColorSchemes.map((c) => (
                    <option key={c.path} value={c.path}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <span className="type-meta text-stone">{t("create.form.plasmaStyle")}</span>
                <select
                  value={selectedPlasmaStyle}
                  onChange={(e) => setSelectedPlasmaStyle(e.target.value)}
                  className="form-field-input"
                >
                  <option value="">{t("create.placeholders.ignore")}</option>
                  {systemPlasmaStyles.map((p) => (
                    <option key={p.path} value={p.path}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <span className="type-meta text-stone">{t("create.form.iconTheme")}</span>
                <select
                  value={selectedIconTheme}
                  onChange={(e) => setSelectedIconTheme(e.target.value)}
                  className="form-field-input"
                >
                  <option value="">{t("create.placeholders.ignore")}</option>
                  {systemIconThemes.map((i) => (
                    <option key={i.path} value={i.name}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <span className="type-meta text-stone">{t("create.form.cursorTheme")}</span>
                <select
                  value={selectedCursorTheme}
                  onChange={(e) => setSelectedCursorTheme(e.target.value)}
                  className="form-field-input"
                >
                  <option value="">{t("create.placeholders.ignore")}</option>
                  {systemCursorThemes.map((c) => (
                    <option key={c.path} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <span className="type-meta text-stone">{t("create.form.kvantumTheme")}</span>
                <select
                  value={selectedKvantumTheme}
                  onChange={(e) => setSelectedKvantumTheme(e.target.value)}
                  className="form-field-input"
                >
                  <option value="">{t("create.placeholders.ignore")}</option>
                  {systemKvantumThemes.map((k) => (
                    <option key={k.path} value={k.name}>{k.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <span className="type-meta text-stone">{t("create.form.gtkTheme")}</span>
                <select
                  value={selectedGtkTheme}
                  onChange={(e) => setSelectedGtkTheme(e.target.value)}
                  className="form-field-input"
                >
                  <option value="">{t("create.placeholders.ignore")}</option>
                  {systemGtkThemes.map((g) => (
                    <option key={g.path} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <span className="type-meta text-stone">{t("create.form.konsoleProfile")}</span>
                <input
                  type="text"
                  placeholder="Ex: Breeze.profile"
                  value={konsoleProfile}
                  onChange={(e) => setKonsoleProfile(e.target.value)}
                  className="form-field-input"
                />
              </div>

              <div className="form-field-group sm:col-span-2">
                <span className="type-meta text-stone">{t("create.form.wallpaper")}</span>
                <div className="flex items-center gap-4 mt-2">
                  <Button variant="ghost" onClick={handleSelectWallpaper} className="flex gap-2 items-center">
                    <FiImage />
                    <span>{t("create.buttons.selectImage")}</span>
                  </Button>
                  {wallpaperPath ? (
                    <span className="type-meta text-graphite truncate max-w-md">{wallpaperPath}</span>
                  ) : (
                    <span className="type-meta text-stone italic">{t("create.buttons.noImage")}</span>
                  )}
                </div>
                {wallpaperPath && (
                  <div className="mt-4 border border-hairline-soft rounded p-1 w-full max-w-sm bg-canvas-warm">
                    <img 
                      src={convertFileSrc(wallpaperPath)} 
                      alt="Wallpaper preview" 
                      className="w-full h-auto aspect-video object-cover rounded-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="card-flat space-y-6">
          <CardSectionHeader title={t("create.steps.step3")} icon={<FiPackage size={15} />} />

          <div className="space-y-6 -mt-2">
            {/* Packages */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="type-body-strong text-ink">{t("create.placeholders.pkgName")} ({t("create.form.currentValue")} Linux packages)</span>
                <Button variant="ghost" className="btn-sm" onClick={() => setDepPackages([...depPackages, ""])}>
                  <FiPlus /> {t("create.buttons.add")}
                </Button>
              </div>
              {depPackages.map((pkg, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t("create.placeholders.pkgName")}
                    value={pkg}
                    onChange={(e) => {
                      const updated = [...depPackages];
                      updated[idx] = e.target.value;
                      setDepPackages(updated);
                    }}
                    className="form-field-input flex-1"
                  />
                  <Button variant="ghost" className="btn-icon text-red-500" onClick={() => setDepPackages(depPackages.filter((_, i) => i !== idx))}>
                    <FiTrash2 size={14} />
                  </Button>
                </div>
              ))}
              {depPackages.length === 0 && (
                <span className="type-meta text-stone italic block">{t("create.placeholders.noPkg")}</span>
              )}
            </div>

            {/* Fonts */}
            <div className="space-y-3 border-t border-hairline-soft pt-4">
              <div className="flex justify-between items-center">
                <span className="type-body-strong text-ink">{t("create.placeholders.fontName")} (e.g. Fira Code)</span>
                <Button variant="ghost" className="btn-sm" onClick={() => setDepFonts([...depFonts, ""])}>
                  <FiPlus /> {t("create.buttons.add")}
                </Button>
              </div>
              {depFonts.map((font, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t("create.placeholders.fontName")}
                    value={font}
                    onChange={(e) => {
                      const updated = [...depFonts];
                      updated[idx] = e.target.value;
                      setDepFonts(updated);
                    }}
                    className="form-field-input flex-1"
                  />
                  <Button variant="ghost" className="btn-icon text-red-500" onClick={() => setDepFonts(depFonts.filter((_, i) => i !== idx))}>
                    <FiTrash2 size={14} />
                  </Button>
                </div>
              ))}
              {depFonts.length === 0 && (
                <span className="type-meta text-stone italic block">{t("create.placeholders.noFont")}</span>
              )}
            </div>

            {/* Icons */}
            <div className="space-y-3 border-t border-hairline-soft pt-4">
              <div className="flex justify-between items-center">
                <span className="type-body-strong text-ink">{t("create.placeholders.iconName")}</span>
                <Button variant="ghost" className="btn-sm" onClick={() => setDepIcons([...depIcons, ""])}>
                  <FiPlus /> {t("create.buttons.add")}
                </Button>
              </div>
              {depIcons.map((icon, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t("create.placeholders.iconName")}
                    value={icon}
                    onChange={(e) => {
                      const updated = [...depIcons];
                      updated[idx] = e.target.value;
                      setDepIcons(updated);
                    }}
                    className="form-field-input flex-1"
                  />
                  <Button variant="ghost" className="btn-icon text-red-500" onClick={() => setDepIcons(depIcons.filter((_, i) => i !== idx))}>
                    <FiTrash2 size={14} />
                  </Button>
                </div>
              ))}
              {depIcons.length === 0 && (
                <span className="type-meta text-stone italic block">{t("create.placeholders.noIcon")}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="card-flat space-y-6">
            <CardSectionHeader title={t("create.review.title")} icon={<FiCheckCircle size={15} />} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 -mt-2">
              <div className="border border-hairline-soft p-4 bg-canvas-warm space-y-3">
                <span className="type-micro-caps text-stone block">{t("create.review.themeMetadata")}</span>
                <div className="space-y-2">
                  <div>
                    <span className="type-meta text-stone block">Name:</span>
                    <span className="type-body-strong text-ink">{displayName} ({name})</span>
                  </div>
                  <div>
                    <span className="type-meta text-stone block">Version:</span>
                    <span className="type-body-strong text-ink">{version}</span>
                  </div>
                  <div>
                    <span className="type-meta text-stone block">Author / License:</span>
                    <span className="type-body-strong text-ink">{author || t("create.review.notProvided")} / {license}</span>
                  </div>
                  {description && (
                    <div>
                      <span className="type-meta text-stone block">Description:</span>
                      <span className="type-body text-graphite">{description}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-hairline-soft p-4 bg-canvas-warm space-y-3">
                <span className="type-micro-caps text-stone block">{t("create.review.components")}</span>
                <div className="space-y-1">
                  <div className="flex justify-between type-meta">
                    <span className="text-stone">{t("create.form.colorScheme")}:</span>
                    <span className="text-ink font-semibold truncate max-w-[200px]">
                      {selectedColorScheme ? systemColorSchemes.find(c => c.path === selectedColorScheme)?.name || "Local Path" : t("create.review.none")}
                    </span>
                  </div>
                  <div className="flex justify-between type-meta">
                    <span className="text-stone">{t("create.form.plasmaStyle")}:</span>
                    <span className="text-ink font-semibold truncate max-w-[200px]">
                      {selectedPlasmaStyle ? systemPlasmaStyles.find(p => p.path === selectedPlasmaStyle)?.name || "Local Path" : t("create.review.none")}
                    </span>
                  </div>
                  <div className="flex justify-between type-meta">
                    <span className="text-stone">{t("create.form.iconTheme")}:</span>
                    <span className="text-ink font-semibold truncate max-w-[200px]">{selectedIconTheme || t("create.review.none")}</span>
                  </div>
                  <div className="flex justify-between type-meta">
                    <span className="text-stone">{t("create.form.cursorTheme")}:</span>
                    <span className="text-ink font-semibold truncate max-w-[200px]">{selectedCursorTheme || t("create.review.none")}</span>
                  </div>
                  <div className="flex justify-between type-meta">
                    <span className="text-stone">Kvantum / GTK:</span>
                    <span className="text-ink font-semibold truncate max-w-[200px]">
                      {selectedKvantumTheme || t("create.review.none")} / {selectedGtkTheme || t("create.review.none")}
                    </span>
                  </div>
                  <div className="flex justify-between type-meta">
                    <span className="text-stone">{t("create.form.wallpaper")}:</span>
                    <span className="text-ink font-semibold truncate max-w-[200px]">{wallpaperPath ? t("create.review.selected") : t("create.review.none")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-flat">
            <CardSectionHeader title={t("create.review.options")} icon={<FiFileText size={15} />} />
            
            <div className="flex items-center justify-between py-2 -mt-2">
              <div className="space-y-0.5">
                <span className="type-body-strong text-ink block">{t("create.review.packTheme")}</span>
                <span className="type-meta text-stone block">{t("create.review.packThemeDesc")}</span>
              </div>
              <Switch 
                isSelected={alsoPack}
                onChange={(val) => setAlsoPack(val)}
              >
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-8">
        <div>
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={isSubmitting}>
              <FiArrowLeft /> {t("create.buttons.back")}
            </Button>
          )}
        </div>
        <div>
          {step < 4 ? (
            <Button variant="primary" onClick={() => {
              if (step === 1) {
                if (validateStep1()) setStep(2);
              } else {
                setStep(step + 1);
              }
            }}>
              {t("create.buttons.next")} <FiArrowRight />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Spinner size="sm" className="text-on-primary" />
              ) : (
                <>
                  <FiCheckCircle />
                  <span>{t("create.buttons.generate")}</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateTheme;
