'use strict'

import loadCapstoneModule from './libcapstone.js'
import * as csc from './libcapstone-const.js'
import loadKeystoneModule from './libkeystone.js'
import * as ksc from './libkeystone-const.js'

/**
 * Assemble content from left textarea to right textarea
 */
function assemble () {
  const btnDisassemblePrevState = document.getElementById('btn-disassemble').disabled
  document.getElementById('btn-assemble').disabled = true
  document.getElementById('btn-disassemble').disabled = true

  const arch = ksc.KS_ARCH_X86
  const mode = ksc.KS_MODE_64
  const assembly = document.getElementById('input-asm').value
  const address = 0

  // Create keystone instance
  const ksPtr = ksModule._malloc(4)
  let err = ksModule._ks_open(arch, mode, ksPtr)
  if (err !== ksc.KS_ERR_OK) {
    ksModule._free(ksPtr)
    const errMsg = ksModule.UTF8ToString(ksModule._ks_strerror(err))
    console.log('error ks_open', errMsg)
    return
  }

  // Configure syntax
  const ksHandle = ksModule.getValue(ksPtr, '*')
  err = ksModule._ks_option(ksHandle, ksc.KS_OPT_SYNTAX, ksc.KS_OPT_SYNTAX_INTEL)
  if (err !== ksc.KS_ERR_OK) {
    ksModule._ks_close(ksHandle)
    ksModule._free(ksPtr)
    const errMsg = ksModule.UTF8ToString(ksModule._ks_strerror(err))
    console.log('error ks_option', errMsg)
    return
  }

  // Assemble
  // The 3rd 64-bit argument is split into 2 32-bit integers
  const bufferPtr = ksModule.allocateUTF8(assembly)
  const insnPtr = ksModule._malloc(4)
  const sizePtr = ksModule._malloc(4)
  const countPtr = ksModule._malloc(4)
  ksModule._ks_asm(ksHandle, bufferPtr, address, 0x0, insnPtr, sizePtr, countPtr)
  err = ksModule._ks_errno(ksHandle)
  if (err !== ksc.KS_ERR_OK) {
    const errMsg = ksModule.UTF8ToString(ksModule._ks_strerror(err))
    console.log('error ks_asm', errMsg)
  } else {
    // Show result if no error
    const insn = ksModule.getValue(insnPtr, '*')
    const size = ksModule.getValue(sizePtr, 'i32')
    const asm = new Uint8Array(size)
    for (let i = 0; i < size; i++) {
      asm[i] = ksModule.getValue(insn + i, 'i8')
    }
    document.getElementById('input-ops').value = Array.from(asm)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Cleanup
  ksModule._ks_free(insnPtr)
  ksModule._free(bufferPtr)
  ksModule._free(insnPtr)
  ksModule._free(sizePtr)
  ksModule._free(countPtr)
  ksModule._ks_close(ksHandle)
  ksModule._free(ksPtr)

  document.getElementById('btn-assemble').disabled = false
  document.getElementById('btn-disassemble').disabled = btnDisassemblePrevState
}

/**
 * Disassemble content from right textarea to left textarea
 */
function disassemble () {
  const btnAssemblePrevState = document.getElementById('btn-assemble').disabled
  document.getElementById('btn-assemble').disabled = true
  document.getElementById('btn-disassemble').disabled = true

  // TODO: test if input-ops value is hexstring
  const arch = csc.CS_ARCH_X86
  const mode = csc.CS_MODE_64
  const asm = document.getElementById('input-ops').value.match(/[0-9a-z]{2}/gi).map(t => parseInt(t, 16))
  const address = 0

  // Create capstone instance
  const csPtr = csModule._malloc(4)
  let err = csModule._cs_open(arch, mode, csPtr)
  if (err !== csc.CS_ERR_OK) {
    csModule._free(csPtr)
    const errMsg = csModule.UTF8ToString(csModule._cs_strerror(err))
    console.log('error cs_open', errMsg)
    return
  }

  // Disassemble
  // The 4th 64-bit argument is split into 2 32-bit integers
  const csHandle = csModule.getValue(csPtr, '*')
  const bufferLen = asm.length
  const bufferPtr = csModule._malloc(bufferLen)
  csModule.writeArrayToMemory(asm, bufferPtr)
  const insnPtrPtr = csModule._malloc(4)
  const count = csModule._cs_disasm(csHandle, bufferPtr, bufferLen, address, 0, 0, insnPtrPtr)
  err = csModule._cs_errno(csHandle)
  if (err !== csc.CS_ERR_OK) {
    const errMsg = ksModule.UTF8ToString(ksModule._cs_strerror(err))
    console.log('cs_disasm error', errMsg)
  }

  // Show instructions
  document.getElementById('input-asm').value = ''
  const insnPtr = csModule.getValue(insnPtrPtr, 'i32')
  for (let i = 0; i < count; i++) {
    const currentInsnPtr = insnPtr + i * 240
    const insnMnemonic = csModule.UTF8ToString(currentInsnPtr + 42).padEnd(7)
    const insnOpStr = csModule.UTF8ToString(currentInsnPtr + 74)
    document.getElementById('input-asm').value += `${insnMnemonic} ${insnOpStr}\n`
  }

  // Cleanup
  csModule._cs_free(insnPtr, count)
  csModule._free(insnPtrPtr)
  csModule._free(bufferPtr)
  csModule._cs_close(csPtr)
  csModule._free(csPtr)

  document.getElementById('btn-assemble').disabled = btnAssemblePrevState
  document.getElementById('btn-disassemble').disabled = false
}

// Load Capstone
let csModule
loadCapstoneModule().then((m) => {
  csModule = m

  // Remove loading indicator
  const loadNotif = document.getElementById('notif-loading-capstone')
  loadNotif.parentElement.removeChild(loadNotif)
  document.getElementById('btn-disassemble').disabled = false
})

// Load Keystone
let ksModule
loadKeystoneModule().then((m) => {
  ksModule = m

  // Remove loading indicator
  const loadNotif = document.getElementById('notif-loading-keystone')
  loadNotif.parentElement.removeChild(loadNotif)
  document.getElementById('btn-assemble').disabled = false
})

// Hook events
document.getElementById('btn-assemble').addEventListener('click', assemble)
document.getElementById('btn-disassemble').addEventListener('click', disassemble)
document.getElementById('input-asm').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault()
    assemble()
  }
})
document.getElementById('input-ops').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault()
    disassemble()
  }
})
