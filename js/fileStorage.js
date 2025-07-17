// js/fileStorage.js - Lógica de interação com o sistema de arquivos para armazenamento de dados
// v2.0 - ADICIONADO: Função scanAndLoadFromDirectory para varredura recursiva de diretórios e carregamento de arquivos.
// v1.0 - Implementação inicial para substituir IndexedDB para stores específicas.

window.SEFWorkStation = window.SEFWorkStation || {};

window.SEFWorkStation.FileStorage = (function() {

    /**
     * Navega por uma estrutura de diretórios e obtém o handle do diretório pai e o nome do arquivo final.
     * @param {string} fullPath - O caminho completo para o arquivo (ex: 'data/itcd/avaliacoes/dbd_123/item.json').
     * @param {object} options - Opções como { create: true } para criar diretórios.
     * @returns {Promise<{parentDirHandle: FileSystemDirectoryHandle, fileName: string}|null>}
     */
    async function _navigateToParentDir(fullPath, options = { create: false }) {
        const appDirectoryHandle = window.SEFWorkStation.State.getDirectoryHandle();
        if (!appDirectoryHandle) {
            console.error("FileStorage: O diretório raiz da aplicação não foi definido.");
            throw new Error("O diretório raiz da aplicação não foi definido.");
        }

        const pathParts = fullPath.split('/').filter(p => p);
        const fileName = pathParts.pop();
        let currentDirHandle = appDirectoryHandle;

        for (const part of pathParts) {
            try {
                currentDirHandle = await currentDirHandle.getDirectoryHandle(part, options);
            } catch (e) {
                if (e.name === 'NotFoundError') {
                     console.warn(`FileStorage: Diretório '${part}' não encontrado em '${fullPath}'.`);
                     return null; // Retorna nulo se um diretório intermediário não for encontrado e create=false
                }
                throw e; // Relança outros erros
            }
        }

        return { parentDirHandle: currentDirHandle, fileName: fileName };
    }

    /**
     * Salva um item em um arquivo JSON.
     * @param {string} filePath - O caminho completo do arquivo.
     * @param {object} itemData - O objeto a ser salvo.
     */
    async function saveItem(filePath, itemData) {
        if (!filePath || !itemData) {
            throw new Error("FileStorage: Caminho do arquivo ou dados do item não fornecidos para salvar.");
        }
        try {
            const navigationResult = await _navigateToParentDir(filePath, { create: true });
            if (!navigationResult) return;
            
            const { parentDirHandle, fileName } = navigationResult;
            const fileHandle = await parentDirHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(itemData, null, 2));
            await writable.close();
        } catch (error) {
            console.error(`FileStorage: Erro ao salvar item em '${filePath}':`, error);
            throw error;
        }
    }

    /**
     * Carrega um item de um arquivo JSON.
     * @param {string} filePath - O caminho completo do arquivo.
     * @returns {Promise<object|null>} O item carregado ou null se não for encontrado.
     */
    async function loadItem(filePath) {
        if (!filePath) return null;
        try {
            const navigationResult = await _navigateToParentDir(filePath, { create: false });
            if (!navigationResult) return null; // Diretório não encontrado

            const { parentDirHandle, fileName } = navigationResult;
            const fileHandle = await parentDirHandle.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const content = await file.text();
            return JSON.parse(content);
        } catch (error) {
            if (error.name === 'NotFoundError') {
                // Isso é esperado se o arquivo não existir, não precisa ser um erro logado.
                return null;
            }
            console.error(`FileStorage: Erro ao carregar item de '${filePath}':`, error);
            throw error;
        }
    }

    /**
     * Exclui um item (arquivo).
     * @param {string} filePath - O caminho completo do arquivo a ser excluído.
     */
    async function deleteItem(filePath) {
        if (!filePath) return;
        try {
            const navigationResult = await _navigateToParentDir(filePath, { create: false });
            if (!navigationResult) return; // Se o diretório pai não existe, o arquivo também não.

            const { parentDirHandle, fileName } = navigationResult;
            await parentDirHandle.removeEntry(fileName);
        } catch (error) {
            if (error.name !== 'NotFoundError') {
                console.error(`FileStorage: Erro ao excluir item em '${filePath}':`, error);
                throw error;
            }
        }
    }

    /**
     * Limpa uma "store", que é um subdiretório dentro de 'data'.
     * @param {string} storeSubDir - O caminho do subdiretório a ser limpo (ex: 'itcd/avaliacoes').
     */
    async function clearStore(storeSubDir) {
        try {
            const navigationResult = await _navigateToParentDir(`data/${storeSubDir}`, { create: false });
            if(!navigationResult) return; // Diretório não existe, nada a fazer.

            const { parentDirHandle, fileName: dirNameToRemove } = navigationResult;
            await parentDirHandle.removeEntry(dirNameToRemove, { recursive: true });
            console.log(`FileStorage: Diretório '${storeSubDir}' limpo com sucesso.`);
        } catch (error) {
            if (error.name !== 'NotFoundError') {
                console.error(`FileStorage: Erro ao limpar a store '${storeSubDir}':`, error);
                throw error;
            }
        }
    }

    /**
     * Limpa todas as stores baseadas em arquivo, removendo o diretório 'data'.
     */
    async function clearAllStores() {
        const appDirectoryHandle = window.SEFWorkStation.State.getDirectoryHandle();
        if (!appDirectoryHandle) return;
        try {
            await appDirectoryHandle.removeEntry('data', { recursive: true });
            await appDirectoryHandle.getDirectoryHandle('data', { create: true });
            console.log("FileStorage: Todos os diretórios de dados foram limpos e recriados.");
        } catch (error) {
            if (error.name !== 'NotFoundError') {
                console.error("FileStorage: Erro ao limpar todos os diretórios de dados:", error);
                throw error;
            }
        }
    }

    /**
     * Função auxiliar recursiva para escanear diretórios.
     * @param {FileSystemDirectoryHandle} dirHandle - O handle do diretório a ser escaneado.
     * @param {Function} fileCallback - A função a ser chamada para cada arquivo .json encontrado.
     */
    async function _scanDirectoryRecursive(dirHandle, fileCallback) {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'directory') {
                await _scanDirectoryRecursive(entry, fileCallback);
            } else if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                try {
                    const file = await entry.getFile();
                    const content = await file.text();
                    const itemData = JSON.parse(content);
                    await fileCallback(itemData); // Chama o callback com os dados do arquivo
                } catch (e) {
                    console.warn(`FileStorage: Erro ao ler ou processar o arquivo '${entry.name}':`, e);
                }
            }
        }
    }

    /**
     * Escaneia um diretório e suas subpastas, carregando todos os arquivos .json encontrados
     * e executando um callback para cada um.
     * @param {FileSystemDirectoryHandle} startDirHandle - O handle do diretório inicial da varredura.
     * @param {Function} fileCallback - A função que processará os dados de cada arquivo encontrado.
     */
    async function scanAndLoadFromDirectory(startDirHandle, fileCallback) {
        if (!startDirHandle || typeof fileCallback !== 'function') {
            console.error("FileStorage: scanAndLoadFromDirectory precisa de um diretório inicial e uma função de callback.");
            return;
        }
        await _scanDirectoryRecursive(startDirHandle, fileCallback);
    }

    return {
        saveItem,
        loadItem,
        deleteItem,
        clearStore,
        clearAllStores,
        scanAndLoadFromDirectory // <-- Nova função exportada
    };
})();