import * as glob from 'glob'
import * as Register from 'winreg'
import { Repository } from '../../models/repository'

export interface IEditor {
  readonly exec: () => void
}

//import * as Path from 'path'

export function isVisualStudioInstalled(): Promise<boolean> {
  const keys = [
    '\\VisualStudio.DTE.8.0',  // 2005
    '\\VisualStudio.DTE.9.0',  // 2008
    '\\VisualStudio.DTE.10.0', // 2010
    '\\VisualStudio.DTE.11.0', // 2012
    '\\VisualStudio.DTE.12.0', // 2013
    '\\VisualStudio.DTE.13.0', // ? not sure what version this is
    '\\VisualStudio.DTE.14.0', // 2015
    '\\VisualStudio.DTE.15.0', // 2017
  ]

  const find = function(i: number, resolve: (value: boolean) => void, reject: (value: any) => void )  {
    if (i >= keys.length) {
      resolve(false)
    } else {
      new Register({
        hive: Register.HKCR,
        key: keys[i],
      }).get('', (err: Error, result: Register.RegistryItem) => {

        if (err) {
          find( i + 1, resolve, reject)
        } else {
          resolve(true)
        }
      })
    }
  }

  return new Promise<boolean>( (resolve, reject) => {
    find(0, resolve, reject)
  })
}

export function isVisualStudioCodeInstalled() {
    let found = false
    new Register({
      hive: Register.HKCR,
      key: '\\vscode',
    }).get('', (err: Error, result: Register.RegistryItem) => {
      if (err == null) {
        found = true
      }
    })

    return found
}

export function findAtomApplication() {
  let path = null
    new Register({
      hive: Register.HKCU,
      key: '\\Software\\Classes\\Aplications\atom.exe\shell\open\command',
    }).get('', (err: Error, result: Register.RegistryItem) => {
      if (err == null) {
        // TODO: remove "%1" from end..
        path = result.value
      }
    })

    return path
}

export function isAtomInstalled() {
    const path = findAtomApplication()
    return path != null
}

class VisualStudioEditor implements IEditor {
  private readonly path: string

  public constructor(path: string) {
    this.path = path
  }
  public exec(): void {
    console.log('exec ' + this.path)
  }
}

function buildVisualStudioSolutionLaunchers(repository: Repository): Promise<IEditor[]> {
  return new Promise<IEditor[]>( (resolve, reject) => {

    const editors = new Array<IEditor>()

    glob('**/*.sln', (err, matches) => {
      if (!err) {
        for (let i = 0; i < matches.length; i++) {
          editors.push( new VisualStudioEditor( matches[i] ) )
        }
        resolve(editors)
      } else {
        reject(err)
      }
    })
  })
}

function buildAtomLauncher(): Promise<IEditor[]> {
  const editors = new Array<IEditor>()
  // TODO: fill this in
  return Promise.resolve(editors)
}

/**
 * Finds editors for a given repository.  Such as solution or workspace files
 * for known applications
 * @param repository  Repository to search
 */
export function getEditorsForRepository(repository: Repository): Promise<IEditor[]> {

  const editors = new Array<IEditor>()
  const empty = new Array<IEditor>()
  return isVisualStudioInstalled()
  .then( (res) => {
    if (res) {
      return buildVisualStudioSolutionLaunchers(repository)
    } else {
      return Promise.resolve( empty )
    }
  })
  .then( (res) => {
    // Visual Studio Solutions (if any)
    editors.push.apply( editors, res )
    return isAtomInstalled()
  })
  .then( (res) => {
    if (res) {
      return buildAtomLauncher()
    } else {
      return Promise.resolve( empty )
    }
  })
  .then( (res) => {
    // Atom launcher if any
    editors.push.apply( editors, res )

    console.log( editors )
    return Promise.resolve(editors)
  })

}

export function getEditorsForItem(path: string) {


}