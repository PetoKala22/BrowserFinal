import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SearchEngine } from '@/lib/types';
import { solidColorOptions } from '@/lib/appearance';
import { SettingsGroup } from '@/components/Browser/settings/SettingsGroup';
import { SearchSettingsSection } from '@/components/Browser/settings/SearchSettingsSection';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';

type StepId = 'welcome' | 'wallpaper' | 'search' | 'adblock';

interface OnboardingFlowProps {
  wallpaper: string;
  onWallpaperChange: (wallpaper: string) => void;
  wallpaperColor: string;
  onWallpaperColorChange: (color: string) => void;
  backgroundType: 'wallpaper' | 'solid';
  onBackgroundTypeChange: (type: 'wallpaper' | 'solid') => void;
  searchEngine: SearchEngine;
  onSearchEngineChange: (engine: SearchEngine) => void;
  adBlockEnabled: boolean;
  onAdBlockEnabledChange: (enabled: boolean) => void;
  isActive: boolean;
  onComplete: () => void;
}

const steps: Array<{ id: StepId; label: string; title: string; description: string }> = [
  {
    id: 'welcome',
    label: 'Welcome',
    title: '',
    description: "Let's take a quick minute to personalize your new space."
  },
  {
    id: 'wallpaper',
    label: 'Wallpaper',
    title: 'Set your background',
    description: 'Pick a wallpaper, choose a solid color, or skip for now.'
  },
  {
    id: 'search',
    label: 'Search',
    title: 'Choose your search engine',
    description: 'Select the default search engine for the address bar.'
  },
  {
    id: 'adblock',
    label: 'Ad blocker',
    title: 'Ad blocker preference',
    description: 'Enable or disable ad blocking. You can change this later.'
  }
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  wallpaper,
  onWallpaperChange,
  wallpaperColor,
  onWallpaperColorChange,
  backgroundType,
  onBackgroundTypeChange,
  searchEngine,
  onSearchEngineChange,
  adBlockEnabled,
  onAdBlockEnabledChange,
  isActive,
  onComplete
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [displayStep, setDisplayStep] = useState(0);
  const [transitionState, setTransitionState] = useState<'idle' | 'exiting' | 'entering'>(
    isActive ? 'entering' : 'idle'
  );
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [typedThankYou, setTypedThankYou] = useState('');
  const [typedIntro, setTypedIntro] = useState('');
  const exitTimerRef = useRef<number | null>(null);
  const enterRafRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const hapticAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastHapticAtRef = useRef(0);

  const activeStep = steps[displayStep];
  const isLastStep = stepIndex === steps.length - 1;
  const isWallpaperStep = steps[stepIndex]?.id === 'wallpaper';
  const thankYouText = 'Thank you for choosing Nook';
  const introText = "Let's get the essentials ready.";
  const hapticSoundUrl = useMemo(
    () => new URL('../../../../assets/Haptic.wav', import.meta.url).toString(),
    []
  );

  const playHaptic = useCallback((volume = 0.1) => {
    const audio = hapticAudioRef.current;
    if (!audio) return;
    const now = performance.now();
    if (now - lastHapticAtRef.current < 40) return;
    lastHapticAtRef.current = now;
    audio.playbackRate = 0.92 + Math.random() * 0.18;
    audio.volume = volume;
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, []);

  const transitionClass = useMemo(() => {
    if (transitionState === 'exiting') {
      return direction === 'forward'
        ? 'opacity-0 -translate-x-2'
        : 'opacity-0 translate-x-2';
    }
    if (transitionState === 'entering') {
      return direction === 'forward'
        ? 'opacity-0 translate-x-2'
        : 'opacity-0 -translate-x-2';
    }
    return 'opacity-100 translate-x-0';
  }, [direction, transitionState]);

  const startTransition = (nextIndex: number) => {
    if (transitionState === 'exiting' || nextIndex === stepIndex) return;
    setDirection(nextIndex > stepIndex ? 'forward' : 'back');
    setTransitionState('exiting');
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
    }
    exitTimerRef.current = window.setTimeout(() => {
      setDisplayStep(nextIndex);
      setStepIndex(nextIndex);
      setTransitionState('entering');
    }, 180);
  };

  useEffect(() => {
    if (isActive) {
      setTransitionState('entering');
    }
  }, [isActive]);

  useEffect(() => {
    if (transitionState !== 'entering') return;
    if (enterRafRef.current !== null) {
      cancelAnimationFrame(enterRafRef.current);
    }
    enterRafRef.current = requestAnimationFrame(() => {
      setTransitionState('idle');
    });
  }, [transitionState]);

  useEffect(() => {
    hapticAudioRef.current = new Audio(hapticSoundUrl);
    hapticAudioRef.current.volume = 0.1;
    hapticAudioRef.current.preload = 'auto';
    return () => {
      if (hapticAudioRef.current) {
        hapticAudioRef.current.pause();
        hapticAudioRef.current = null;
      }
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
      if (enterRafRef.current !== null) {
        cancelAnimationFrame(enterRafRef.current);
      }
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
      }
      setTypedThankYou('');
      setTypedIntro('');
      return;
    }
    if (activeStep.id !== 'welcome') {
      setTypedThankYou(thankYouText);
      setTypedIntro(introText);
      return;
    }
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
    }
    setTypedThankYou('');
    setTypedIntro('');
    let index = 0;

    const typeNext = () => {
      index += 1;
      setTypedThankYou(thankYouText.slice(0, index));
      playHaptic();
      if (index < thankYouText.length) {
        typingTimerRef.current = window.setTimeout(typeNext, 45);
        return;
      }
      let introIndex = 0;
      const typeIntro = () => {
        introIndex += 1;
        setTypedIntro(introText.slice(0, introIndex));
        playHaptic(0.04);
        if (introIndex < introText.length) {
          typingTimerRef.current = window.setTimeout(typeIntro, 30);
        }
      };
      typingTimerRef.current = window.setTimeout(typeIntro, 200);
    };

    typingTimerRef.current = window.setTimeout(typeNext, 150);
    return () => {
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, [activeStep.id, isActive, playHaptic, thankYouText, introText]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      return;
    }
    startTransition(stepIndex + 1);
  };

  const handleBack = () => {
    if (stepIndex === 0) return;
    startTransition(stepIndex - 1);
  };

  const renderStepContent = () => {
    switch (activeStep.id) {
      case 'welcome':
        return (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center text-center py-16">
            <div className="text-2xl font-semibold text-[color:var(--ui-text)]">
              {typedThankYou}
            </div>
            <p className="mt-3 min-h-[1.25rem] text-sm text-[color:var(--ui-text-muted)]">
              {typedIntro}
            </p>
          </div>
        );
      case 'wallpaper': {
        const hasWallpaper = Boolean(wallpaper);
        const activeWallpaper = backgroundType === 'wallpaper' ? wallpaper : '';
        const activeColor = backgroundType === 'solid' ? wallpaperColor : '';
        return (
          <div className="space-y-8">
            <SettingsGroup title="Background">
              <div className="py-4">
                <div className="mx-auto max-w-5xl space-y-6">

                  <div className="flex items-center justify-center">
                    <div className="flex items-center rounded-xl bg-[color:var(--ui-hover-strong)] p-1">
                      {(['wallpaper', 'solid'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => onBackgroundTypeChange(type)}
                          className={`px-3 py-1 text-xs font-medium rounded-lg transition ${
                            backgroundType === type
                              ? 'bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text)] shadow-sm'
                              : 'text-[color:var(--ui-text-muted)] hover:text-[color:var(--ui-text)]'
                          }`}
                        >
                          {type === 'wallpaper' ? 'Wallpaper' : 'Solid'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mx-auto w-full max-w-4xl overflow-x-hidden">
                    <div className="relative isolate aspect-video overflow-hidden rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)]">
                      {activeWallpaper ? (
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${activeWallpaper})` }}
                        />
                      ) : activeColor ? (
                        <div
                          className="absolute inset-0"
                          style={{ backgroundColor: activeColor }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                          <div>
                            <p className="text-sm text-[color:var(--ui-text-muted)]">
                              No background selected
                            </p>
                            <p className="text-xs text-[color:var(--ui-text-subtle)]">
                              Choose one below to personalize your start page.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative mx-auto flex min-h-[72px] w-full max-w-md items-center justify-center">
                    <div
                      className={`absolute inset-0 flex items-center justify-center gap-3 transition-[opacity,transform] duration-200 ${
                        backgroundType === 'wallpaper'
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-1 pointer-events-none'
                      }`}
                    >
                      <label className="cursor-pointer mb-6 rounded-lg bg-[color:var(--ui-accent)] px-4 py-2.5 text-sm font-medium text-[color:var(--ui-accent-contrast)] transition hover:opacity-90">
                        {hasWallpaper ? 'Change Wallpaper' : 'Upload Wallpaper'}
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                onWallpaperChange(reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>

                      {hasWallpaper && (
                        <button
                          onClick={() => onWallpaperChange('')}
                          className="rounded-lg mb-6 px-4 py-2.5 text-sm font-medium transition hover:bg-[color:var(--ui-hover)]"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div
                      className={`absolute inset-0 flex mb-6 flex-wrap items-center justify-center gap-2 transition-[opacity,transform] duration-200 ${
                        backgroundType === 'solid'
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-1 pointer-events-none'
                      }`}
                    >
                      {solidColorOptions.map((color) => {
                        const isDefault = color === 'default';
                        const isSelected = isDefault
                          ? !wallpaperColor
                          : wallpaperColor === color;

                        return (
                          <button
                            key={color}
                            onClick={() => onWallpaperColorChange(isDefault ? '' : color)}
                            className={`relative h-6 w-6 rounded-full border transition ${
                              isSelected
                                ? 'border-[color:var(--ui-ring)] ring-2 ring-[color:var(--ui-ring)]'
                                : 'border-[color:var(--ui-border)] hover:border-[color:var(--ui-ring)]'
                            }`}
                            style={{
                              backgroundColor: isDefault ? '#181716' : color
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </SettingsGroup>
          </div>
        );
      }
      case 'search':
        return (
          <SearchSettingsSection
            searchEngine={searchEngine}
            onSearchEngineChange={onSearchEngineChange}
          />
        );
      case 'adblock':
        return (
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-3xl">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)] px-5 py-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[color:var(--ui-text)]">Enable ad blocker</div>
                  <div className="mt-1 text-xs text-[color:var(--ui-text-muted)]">Enable the built-in ad blocker to reduce intrusive ads. You can change this later in Settings.</div>
                </div>

                <div className="flex-shrink-0">
                  <ToggleSwitch
                    checked={adBlockEnabled}
                    onChange={onAdBlockEnabledChange}
                    ariaLabel="Toggle ad blocker"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
  <div className="h-full w-full overflow-hidden">
    <div className="flex h-full items-center justify-center p-8">
      <div
        className="flex w-full max-w-6xl flex-col rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface)] shadow-xl overflow-hidden h-[min(85vh,800px)]"
      >
        {/* Progress indicator */}
        <div className="flex shrink-0 items-center justify-center gap-2 px-6 py-5">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => startTransition(index)}
              className="group relative flex items-center"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                  index === stepIndex
                    ? 'bg-[color:var(--ui-accent)] text-[color:var(--ui-accent-contrast)] ring-4 ring-[color:var(--ui-accent)]/20'
                    : index < stepIndex
                    ? 'bg-[color:var(--ui-accent)]/20 text-[color:var(--ui-accent)]'
                    : 'bg-[color:var(--ui-surface-strong)] text-[color:var(--ui-text-subtle)]'
                } ${index !== stepIndex ? 'group-hover:bg-[color:var(--ui-hover)]' : ''}`}
              >
                {index + 1}
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`mx-2 h-0.5 w-12 transition-colors ${
                    index < stepIndex
                      ? 'bg-[color:var(--ui-accent)]'
                      : 'bg-[color:var(--ui-border)]'
                  }`}
                />
              )}

              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-[color:var(--ui-text-subtle)] opacity-0 transition-opacity group-hover:opacity-100">
                {step.label}
              </span>
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Title */}
          <div className="shrink-0 px-8 py-5 text-center">
            <h2 className="text-2xl font-bold text-[color:var(--ui-text)]">
              {activeStep.title}
            </h2>
            {activeStep.id !== 'welcome' && (
              <p className="mt-1 text-sm text-[color:var(--ui-text-muted)]">
                {activeStep.description}
              </p>
            )}
          </div>

          {/* Step content (no scrolling) */}
          <div
            className={`flex flex-1 items-center justify-center px-8 pb-6 transition-[opacity,transform] duration-250 ease-out ${transitionClass}`}
          >
            <div className="w-full max-w-3xl">
              {renderStepContent()}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex shrink-0 items-center justify-between px-8 py-5">
          <button
            type="button"
            onClick={handleBack}
            disabled={stepIndex === 0}
            className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${
              stepIndex === 0
                ? 'invisible'
                : 'text-[color:var(--ui-text)] hover:bg-[color:var(--ui-hover)]'
            }`}
          >
            Back
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-[color:var(--ui-accent)] px-6 py-2.5 text-sm font-semibold text-[color:var(--ui-accent-contrast)] transition hover:brightness-95 shadow-lg shadow-[color:var(--ui-accent)]/20"
            >
              {isLastStep ? 'Finish Setup' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
