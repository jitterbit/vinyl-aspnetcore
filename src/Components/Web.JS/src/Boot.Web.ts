// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.

// Currently this only deals with inserting streaming content into the DOM.
// Later this will be expanded to include:
//  - Progressive enhancement of navigation and form posting
//  - Preserving existing DOM elements in all the above
//  - The capabilities of Boot.Server.ts and Boot.WebAssembly.ts to handle insertion
//    of interactive components

import { DotNet } from '@microsoft/dotnet-js-interop';
import { startCircuit } from './Boot.Server.Common';
import { loadWebAssemblyPlatform, startWebAssembly } from './Boot.WebAssembly.Common';
import { shouldAutoStart } from './BootCommon';
import { Blazor } from './GlobalExports';
import { WebStartOptions } from './Platform/WebStartOptions';
import { attachStreamingRenderingListener } from './Rendering/StreamingRendering';
import { NavigationEnhancementCallbacks, attachProgressivelyEnhancedNavigationListener } from './Services/NavigationEnhancement';
import { ComponentDescriptor } from './Services/ComponentDescriptorDiscovery';
import { RootComponentManager, attachAutoModeResolver } from './Services/RootComponentManager';
import { DescriptorHandler, attachComponentDescriptorHandler, registerAllComponentDescriptors } from './Rendering/DomMerging/DomSync';

let started = false;
let isPerformingEnhancedNavigation = false;
let webStartOptions: Partial<WebStartOptions> | undefined;
let hasWebAssemblyLoaded = false;

const rootComponentManager = new RootComponentManager();

function boot(options?: Partial<WebStartOptions>) : Promise<void> {
  if (started) {
    throw new Error('Blazor has already started.');
  }
  started = true;
  webStartOptions = options;

  const navigationEnhancementCallbacks: NavigationEnhancementCallbacks = {
    beforeEnhancedNavigation,
    afterDocumentUpdated,
    afterEnhancedNavigation,
  };

  const descriptorHandler: DescriptorHandler = {
    registerComponentDescriptor,
  };

  attachComponentDescriptorHandler(descriptorHandler);
  attachStreamingRenderingListener(options?.ssr, navigationEnhancementCallbacks);
  attachAutoModeResolver(() => {
    if (hasWebAssemblyLoaded) {
      startWebAssemblyIfNotStarted();
      return 'webassembly';
    } else {
      startCircuitIfNotStarted();
      return 'server';
    }
  });

  if (!options?.ssr?.disableDomPreservation) {
    attachProgressivelyEnhancedNavigationListener(navigationEnhancementCallbacks);
  }

  registerAllComponentDescriptors(document);

  return Promise.resolve();
}

function registerComponentDescriptor(descriptor: ComponentDescriptor) {
  rootComponentManager.registerComponentDescriptor(descriptor);

  if (descriptor.type === 'auto') {
    startLoadingWebAssembly();
  } else if (descriptor.type === 'server') {
    startCircuitIfNotStarted();
  } else if (descriptor.type === 'webassembly') {
    startWebAssemblyIfNotStarted();
  }
}

function beforeEnhancedNavigation() {
  isPerformingEnhancedNavigation = true;
}

function afterDocumentUpdated() {
  handleUpdatedDescriptors();
}

function afterEnhancedNavigation() {
  isPerformingEnhancedNavigation = false;
  handleUpdatedDescriptors();
}

function handleUpdatedDescriptors() {
  const shouldAddNewRootComponents = !isPerformingEnhancedNavigation;
  rootComponentManager.handleUpdatedRootComponents(shouldAddNewRootComponents);
}

let hasCircuitStarted = false;
async function startCircuitIfNotStarted() {
  if (hasCircuitStarted) {
    return;
  }

  hasCircuitStarted = true;
  await startCircuit(webStartOptions?.circuit, rootComponentManager);
  handleUpdatedDescriptors();
}

let hasStartedLoadingWebAssembly = false;
async function startLoadingWebAssembly() {
  if (hasStartedLoadingWebAssembly) {
    return;
  }

  hasStartedLoadingWebAssembly = true;
  await loadWebAssemblyPlatform(webStartOptions?.webAssembly);
  hasWebAssemblyLoaded = true;
}

let isStartingWebAssembly = false;
async function startWebAssemblyIfNotStarted() {
  if (isStartingWebAssembly) {
    return;
  }

  isStartingWebAssembly = true;
  await startWebAssembly(webStartOptions?.webAssembly, rootComponentManager);
  hasWebAssemblyLoaded = true;
  handleUpdatedDescriptors();
}

Blazor.start = boot;
window['DotNet'] = DotNet;

if (shouldAutoStart()) {
  boot();
}
