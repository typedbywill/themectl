import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner, Switch } from "@heroui/react";
import { PageHeader } from "../components/layout/PageHeader";
import { CardSectionHeader } from "../components/ui/CardSectionHeader";
import { Button } from "../components/ui/Button";
import { api } from "../services/api";
import { SystemComponent, CreateThemeInput } from "../types";
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
        toast.error("Erro ao carregar componentes do sistema.");
      } finally {
        setLoadingComponents(false);
      }
    };

    fetchSystemComponents();
  }, []);

  // Auto slugify name when display name changes
  const handleDisplayNameChange = (val: string) => {
    setDisplayName(val);
    // Convert to lowercase, remove non-alphanumeric, replace spaces with hyphen
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
      toast.error("Erro ao selecionar imagem.");
    }
  };

  // Input Validation for Step 1
  const validateStep1 = (): boolean => {
    if (!displayName.trim()) {
      toast.error("Nome de exibição é obrigatório.");
      return false;
    }
    const nameRegex = /^[a-z0-9][a-z0-9-]{1,63}$/;
    if (!nameRegex.test(name)) {
      toast.error("ID/Nome do tema deve conter apenas letras minúsculas, números e hífens.");
      return false;
    }
    const semverRegex = /^\d+\.\d+\.\d+(\-[a-zA-Z0-9\.\-]+)?(\+[a-zA-Z0-9\.\-]+)?$/;
    if (!semverRegex.test(version)) {
      toast.error("Versão precisa estar no formato SemVer válido (ex: 1.0.0).");
      return false;
    }
    if (description.length > 200) {
      toast.error("A descrição não pode exceder 200 caracteres.");
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
      toast.success(`Tema '${result.theme_name}' criado com sucesso!`);
      navigate(`/installed/${result.theme_name}`);
    } catch (err: any) {
      toast.error(`Erro ao criar tema: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container page-container-narrow">
      <PageHeader 
        eyebrow="Criar Novo Tema"
        title="Theme Wizard" 
        subtitle="Configure as propriedades, componentes e dependências do seu novo tema customizado." 
      />

      {/* Step Indicators */}
      <div className="flex justify-between items-center border-b border-hairline pb-4 mb-6">
        <div className={`flex flex-col items-center gap-1 flex-1 ${step >= 1 ? "text-ink" : "text-stone"}`}>
          <span className="type-micro-caps">Passo 1</span>
          <span className="type-body-strong">Metadados</span>
          <div className={`h-1 w-full mt-2 ${step >= 1 ? "bg-primary" : "bg-hairline"}`}></div>
        </div>
        <div className={`flex flex-col items-center gap-1 flex-1 ${step >= 2 ? "text-ink" : "text-stone"}`}>
          <span className="type-micro-caps">Passo 2</span>
          <span className="type-body-strong">Componentes</span>
          <div className={`h-1 w-full mt-2 ${step >= 2 ? "bg-primary" : "bg-hairline"}`}></div>
        </div>
        <div className={`flex flex-col items-center gap-1 flex-1 ${step >= 3 ? "text-ink" : "text-stone"}`}>
          <span className="type-micro-caps">Passo 3</span>
          <span className="type-body-strong">Dependências</span>
          <div className={`h-1 w-full mt-2 ${step >= 3 ? "bg-primary" : "bg-hairline"}`}></div>
        </div>
        <div className={`flex flex-col items-center gap-1 flex-1 ${step >= 4 ? "text-ink" : "text-stone"}`}>
          <span className="type-micro-caps">Passo 4</span>
          <span className="type-body-strong">Revisar</span>
          <div className={`h-1 w-full mt-2 ${step >= 4 ? "bg-primary" : "bg-hairline"}`}></div>
        </div>
      </div>

      {/* Step Contents */}
      {step === 1 && (
        <div className="card-flat space-y-6">
          <CardSectionHeader title="Metadados do Tema" icon={<FiInfo size={15} />} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 -mt-2">
            <div className="form-field-group">
              <span className="type-meta text-stone">Nome de Exibição</span>
              <input
                type="text"
                placeholder="Ex: Minimal Dark"
                value={displayName}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                className="form-field-input"
              />
            </div>

            <div className="form-field-group">
              <span className="type-meta text-stone">ID do Tema (Slug)</span>
              <input
                type="text"
                placeholder="Ex: minimal-dark"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-field-input"
              />
              <span className="type-meta text-stone mt-1">Identificador único (minúsculas, números e hífens).</span>
            </div>

            <div className="form-field-group">
              <span className="type-meta text-stone">Versão</span>
              <input
                type="text"
                placeholder="1.0.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="form-field-input"
              />
            </div>

            <div className="form-field-group">
              <span className="type-meta text-stone">Autor</span>
              <input
                type="text"
                placeholder="Ex: Seu Nome"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="form-field-input"
              />
            </div>

            <div className="form-field-group sm:col-span-2">
              <span className="type-meta text-stone">Descrição</span>
              <textarea
                maxLength={200}
                placeholder="Breve descrição do tema (máx 200 caracteres)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-field-input min-h-[80px] py-2"
              />
              <div className="flex justify-between type-meta text-stone mt-1">
                <span>Será mostrada nas listagens de temas.</span>
                <span>{description.length}/200</span>
              </div>
            </div>

            <div className="form-field-group">
              <span className="type-meta text-stone">Licença</span>
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
          <CardSectionHeader title="Componentes Visuais" icon={<FiGrid size={15} />} />

          {loadingComponents ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Spinner size="md" className="text-ink" />
              <span className="type-meta text-stone">Carregando componentes do sistema...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 -mt-2">
              <div className="form-field-group">
                <span className="type-meta text-stone">Color Scheme</span>
                <select
                  value={selectedColorScheme}
                  onChange={(e) => setSelectedColorScheme(e.target.value)}
                  className="form-field-input"
                >
                  <option value="">-- Ignorar ou Não Definido --</option>
                  {systemColorSchemes.map((c) => (
                    <option key={c.path} value={c.path}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <span className="type-meta text-stone">Estilo Plasma</span>
                <select
                  value={selectedPlasmaStyle}
                  onChange={(e) => setSelectedPlasmaStyle(e.target.value)}
                  className="form-field-input"
                >
                  <option value="">-- Ignorar ou Não Definido --</option>
                  {systemPlasmaStyles.map((p) => (
                    <option key={p.path} value={p.path}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <span className="type-meta text-stone">Tema de Ícones</span>
                <select
                  value={selectedIconTheme}
                  onChange={(e) => setSelectedIconTheme(e.target.value)}
                  className="form-field-input"
                >
                  <option value="">-- Ignorar ou Não Definido --</option>
                  {systemIconThemes.map((i) => (
                    <option key={i.path} value={i.name}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <span className="type-meta text-stone">Cursor de Mouse</span>
                <select
                  value={selectedCursorTheme}
                  onChange={(e) => setSelectedCursorTheme(e.target.value)}
                  className="form-field-input"
                >
                  <option value="">-- Ignorar ou Não Definido --</option>
                  {systemCursorThemes.map((c) => (
                    <option key={c.path} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <span className="type-meta text-stone">Tema Kvantum</span>
                <select
                  value={selectedKvantumTheme}
                  onChange={(e) => setSelectedKvantumTheme(e.target.value)}
                  className="form-field-input"
                >
                  <option value="">-- Ignorar ou Não Definido --</option>
                  {systemKvantumThemes.map((k) => (
                    <option key={k.path} value={k.name}>{k.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <span className="type-meta text-stone">Tema GTK</span>
                <select
                  value={selectedGtkTheme}
                  onChange={(e) => setSelectedGtkTheme(e.target.value)}
                  className="form-field-input"
                >
                  <option value="">-- Ignorar ou Não Definido --</option>
                  {systemGtkThemes.map((g) => (
                    <option key={g.path} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-field-group">
                <span className="type-meta text-stone">Perfil do Konsole</span>
                <input
                  type="text"
                  placeholder="Ex: Breeze.profile"
                  value={konsoleProfile}
                  onChange={(e) => setKonsoleProfile(e.target.value)}
                  className="form-field-input"
                />
              </div>

              <div className="form-field-group sm:col-span-2">
                <span className="type-meta text-stone">Wallpaper (Imagem)</span>
                <div className="flex items-center gap-4 mt-2">
                  <Button variant="ghost" onClick={handleSelectWallpaper} className="flex gap-2 items-center">
                    <FiImage />
                    <span>Selecionar Imagem</span>
                  </Button>
                  {wallpaperPath ? (
                    <span className="type-meta text-graphite truncate max-w-md">{wallpaperPath}</span>
                  ) : (
                    <span className="type-meta text-stone italic">Nenhum wallpaper selecionado</span>
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
          <CardSectionHeader title="Dependências do Tema" icon={<FiPackage size={15} />} />

          <div className="space-y-6 -mt-2">
            {/* Packages */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="type-body-strong text-ink">Pacotes do Sistema (e.g. kvantum, fastfetch)</span>
                <Button variant="ghost" className="btn-sm" onClick={() => setDepPackages([...depPackages, ""])}>
                  <FiPlus /> Add
                </Button>
              </div>
              {depPackages.map((pkg, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nome do pacote"
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
                <span className="type-meta text-stone italic block">Nenhuma dependência de pacotes declarada.</span>
              )}
            </div>

            {/* Fonts */}
            <div className="space-y-3 border-t border-hairline-soft pt-4">
              <div className="flex justify-between items-center">
                <span className="type-body-strong text-ink">Fontes Necessárias (e.g. JetBrainsMono Nerd Font)</span>
                <Button variant="ghost" className="btn-sm" onClick={() => setDepFonts([...depFonts, ""])}>
                  <FiPlus /> Add
                </Button>
              </div>
              {depFonts.map((font, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nome da fonte"
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
                <span className="type-meta text-stone italic block">Nenhuma dependência de fontes declarada.</span>
              )}
            </div>

            {/* Icons */}
            <div className="space-y-3 border-t border-hairline-soft pt-4">
              <div className="flex justify-between items-center">
                <span className="type-body-strong text-ink">Temas de Ícones Requeridos</span>
                <Button variant="ghost" className="btn-sm" onClick={() => setDepIcons([...depIcons, ""])}>
                  <FiPlus /> Add
                </Button>
              </div>
              {depIcons.map((icon, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nome do tema de ícones"
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
                <span className="type-meta text-stone italic block">Nenhum tema de ícone requerido declarado.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="card-flat space-y-6">
            <CardSectionHeader title="Revisar e Concluir" icon={<FiCheckCircle size={15} />} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 -mt-2">
              <div className="border border-hairline-soft p-4 bg-canvas-warm space-y-3">
                <span className="type-micro-caps text-stone block">Metadados do Tema</span>
                <div className="space-y-2">
                  <div>
                    <span className="type-meta text-stone block">Nome:</span>
                    <span className="type-body-strong text-ink">{displayName} ({name})</span>
                  </div>
                  <div>
                    <span className="type-meta text-stone block">Versão:</span>
                    <span className="type-body-strong text-ink">{version}</span>
                  </div>
                  <div>
                    <span className="type-meta text-stone block">Autor / Licença:</span>
                    <span className="type-body-strong text-ink">{author || "Não informado"} / {license}</span>
                  </div>
                  {description && (
                    <div>
                      <span className="type-meta text-stone block">Descrição:</span>
                      <span className="type-body text-graphite">{description}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-hairline-soft p-4 bg-canvas-warm space-y-3">
                <span className="type-micro-caps text-stone block">Componentes</span>
                <div className="space-y-1">
                  <div className="flex justify-between type-meta">
                    <span className="text-stone">Color Scheme:</span>
                    <span className="text-ink font-semibold truncate max-w-[200px]">
                      {selectedColorScheme ? systemColorSchemes.find(c => c.path === selectedColorScheme)?.name || "Local Path" : "Nenhum"}
                    </span>
                  </div>
                  <div className="flex justify-between type-meta">
                    <span className="text-stone">Plasma Style:</span>
                    <span className="text-ink font-semibold truncate max-w-[200px]">
                      {selectedPlasmaStyle ? systemPlasmaStyles.find(p => p.path === selectedPlasmaStyle)?.name || "Local Path" : "Nenhum"}
                    </span>
                  </div>
                  <div className="flex justify-between type-meta">
                    <span className="text-stone">Ícones:</span>
                    <span className="text-ink font-semibold truncate max-w-[200px]">{selectedIconTheme || "Nenhum"}</span>
                  </div>
                  <div className="flex justify-between type-meta">
                    <span className="text-stone">Cursor:</span>
                    <span className="text-ink font-semibold truncate max-w-[200px]">{selectedCursorTheme || "Nenhum"}</span>
                  </div>
                  <div className="flex justify-between type-meta">
                    <span className="text-stone">Kvantum / GTK:</span>
                    <span className="text-ink font-semibold truncate max-w-[200px]">
                      {selectedKvantumTheme || "Nenhum"} / {selectedGtkTheme || "Nenhum"}
                    </span>
                  </div>
                  <div className="flex justify-between type-meta">
                    <span className="text-stone">Wallpaper:</span>
                    <span className="text-ink font-semibold truncate max-w-[200px]">{wallpaperPath ? "Selecionado" : "Nenhum"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-flat">
            <CardSectionHeader title="Opções de Criação" icon={<FiFileText size={15} />} />
            
            <div className="flex items-center justify-between py-2 -mt-2">
              <div className="space-y-0.5">
                <span className="type-body-strong text-ink block">Empacotar como arquivo .theme</span>
                <span className="type-meta text-stone block">Gera um pacote compactado .theme pronto para compartilhamento.</span>
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
              <FiArrowLeft /> Voltar
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
              Avançar <FiArrowRight />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Spinner size="sm" className="text-on-primary" />
              ) : (
                <>
                  <FiCheckCircle />
                  <span>Criar Tema</span>
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
