import { MapFileRecord } from './MapFile'
/// <summary>
/// This is the base class used for all other data block types...&#13;
/// it contains all the base functions to handle binary data.&#10;
/// Это базовый класс для всех остальных типов блоков данных ... 
/// Он содержит все базовые функции для обработки двоичных данных.
/// </summary>

class Stream {
    Position = 0
    buf: Uint8Array
    constructor(buf: Uint8Array) {
        this.buf = buf;
    }
    Read(out: Uint8Array, offset: number, size: number) {
        let data = this.buf.slice(this.Position, this.Position + size)
        this.Position += size;
        out.set(data, offset)
        return data
    }
}

type bool = boolean
type int = number
type byte = number
type short = number
type double = number
type long = number

export class TABRawBinBlock {

    /// <summary>
    /// Связанный дескриптор файла
    /// </summary>
    m_fp: Stream; // Associated file handle

    get Position() { return this.m_fp.Position; }
    set Position(value) { this.m_fp.Position = value; }

    m_eAccess: TABAccess = 2; // Read/Write access mode 

    protected m_nBlockType: SupportedBlockTypes = 0;
    /// <summary>
    /// Буфер содержит данные блоков
    /// </summary>
    protected m_pabyBuf: byte = 0; // Buffer to contain the block's data 
    /// <summary>
    /// Размер текущего блока (и буфера)
    /// </summary>
    protected m_nBlockSize: int = 0; // Size of current block (and buffer) 
    /// <summary>
    /// Количество байтов, используемых в буфере
    /// </summary>
    protected m_nSizeUsed: int = 0; // Number of bytes used in buffer 
    /// <summary>
    /// TRUE=Блоки должны быть всегда nSize байт
    /// FALSE=последний блок может быть меньше, чем nSize
    /// </summary>
    protected m_bHardBlockSize: bool = false;
    /// <summary>
    /// Расположение текущего блока в файле
    /// </summary>
    protected m_nFileOffset: int = 0; // Location of current block in the file 
    /// <summary>
    /// Следующий байт для чтения из m_pabyBuf []
    /// </summary>
    protected m_nCurPos: int = 0; // Next byte to read from m_pabyBuf[] 
    /// <summary>
    /// Размер заголовка файла, если отличается от размера блока (используется GotoByteInFile ())
    /// </summary>
    protected m_nFirstBlockPtr: int = 0; // Size of file header when different from block size (used by GotoByteInFile())
    /// <summary>
    /// Используется только для обнаружения изменений
    /// </summary>
    protected m_bModified: bool = false; // Used only to detect changes

    public GetStartAddress(): number {
        return this.m_nFileOffset;
    }

    public SetModifiedFlag(bModified: bool): void {
        this.m_bModified = bModified;
    }

    /// <summary>
    /// This semi-private method gives a direct access to the  buffer... /n
    /// to be used with extreme care!
    /// Это полу-частный метод дает прямой доступ к внутренним буфером, 
    /// который будет использоваться с особой осторожностью!
    /// </summary>
    /// <returns></returns>
    public GetCurDataPtr(): int {
        return (this.m_pabyBuf + this.m_nCurPos);
    }
    /// <summary>
    /// Конструктор
    /// </summary>
    /// <param name="eAccessMode"></param>
    /// <param name="bHardBlockSize"></param>

    constructor(streamOreAccessMode: TABAccess | Stream, bHardBlockSize?: bool) {
        let stream = streamOreAccessMode
        if (streamOreAccessMode) {

            this.m_fp = stream as Stream;
        } else {
            this.m_fp = stream as Stream;
            this.m_bHardBlockSize = bHardBlockSize as bool;
            this.m_eAccess = streamOreAccessMode;
            this.m_nFirstBlockPtr = 0;
            this.m_nBlockSize = this.m_nSizeUsed = this.m_nFileOffset = this.m_nCurPos = 0;
        }
    }



    /// <summary>
    /// Load data from the specified file location and initialize the block.
    /// Загрузка данных из указанного местоположения файла и инициализировать блок.
    /// </summary>
    /// <param name="fpSrc"></param>
    /// <param name="nOffset"></param>
    /// <param name="nSize"></param>
    /// <returns>
    /// Returns 0 if succesful or -1 if an error happened, in which case CPLError() will have been called.
    /// Возвращает 0, если успешным или -1, если произошло ошибок, и в этом случае CPLError () будет были названы.
    /// </returns>
    ReadFromFile(fpSrc: Stream, nOffset: int, nSize: int /*= 512*/): bool {

        if (fpSrc == null || nSize == 0) {
            throw new Error("Утверждение не удалось!"); //CPLError(CE_Failure, CPLE_AssertionFailed, );
            //return false;
        }

        this.m_fp = fpSrc;
        this.m_nFileOffset = nOffset;
        this.m_nCurPos = 0;
        this.m_bModified = false;

        //pabyBuf = (GByte)CPLMalloc(nSize * sizeof(GByte)); // Alloc a buffer to contain the data

        //    ----------------------------------------------------------------
        //     * Read from the file
        //     *---------------------------------------------------------------
        //if (VSIFSeek(fpSrc, nOffset, SEEK_SET) != 0 || (m_nSizeUsed = VSIFRead(pabyBuf, sizeof(GByte), nSize, fpSrc)) == 0 || (m_bHardBlockSize && m_nSizeUsed != nSize))
        //{
        //    CPLError(CE_Failure, CPLE_FileIO, "ReadFromFile() failed reading %d bytes at offset %d.", nSize, nOffset);
        //    CPLFree(pabyBuf);
        //    return -1;
        //}

        //    ---------------------------------------------------------------
        //     Init block with the data we just read
        //    ---------------------------------------------------------------
        return this.InitBlockFromData(fpSrc, nSize, this.m_nSizeUsed, nOffset);
    }

    /// <summary>
    /// Set the binary data buffer and initialize the block.
    /// Установите двоичный буфер данных и инициализируйте блок.
    /// Вызов ReadFromFile () автоматически вызывает InitBlockFromData () для завершения 
    /// инициализации блока после чтения данных из файла. Производные классы должны 
    /// осуществлять свою собственную версию InitBlockFromData (), если они нуждаются 
    /// в особой инициализации ... в этом случае происходит InitBlockFromData () должен вызвать 
    /// InitBlockFromData (), прежде чем делать что-нибудь еще.
    /// </summary>
    /// <param name="pabyBuf"></param>
    /// <param name="nBlockSize"></param>
    /// <param name="nSizeUsed"></param>
    /// <param name="bMakeCopy"></param>
    /// <param name="fpSrc"></param>
    /// <param name="nOffset"></param>
    /// <returns></returns>
    InitBlockFromData(fpSrc: Stream, nBlockSize: int, nSizeUsed: int, nOffset: int): bool {
        this.m_fp = fpSrc;
        this.m_nFileOffset = nOffset;
        this.m_nCurPos = 0;
        //m_bModified = 0;

        //    ----------------------------------------------------------------
        //     * Alloc or realloc the buffer to contain the data if necessary
        //     *---------------------------------------------------------------
        //if (bMakeCopy == null)
        //{
        //    if (m_pabyBuf != null)
        //        CPLFree(m_pabyBuf);
        //    m_pabyBuf = pabyBuf;
        //    m_nBlockSize = nBlockSize;
        //    m_nSizeUsed = nSizeUsed;
        //}
        //else if (m_pabyBuf == null || nBlockSize != m_nBlockSize)
        //{
        //    //m_pabyBuf = (GByte)CPLRealloc(m_pabyBuf, nBlockSize * sizeof(GByte));
        //    m_nBlockSize = nBlockSize;
        //    m_nSizeUsed = nSizeUsed;
        //    //C++ TO C# CONVERTER TODO TASK: The memory management function 'memcpy' has no equivalent in C#:
        //    //memcpy(m_pabyBuf, pabyBuf, m_nSizeUsed);
        //}

        //    ----------------------------------------------------------------
        //     * Extract block type... header block (first block in a file) has
        //     * no block type, so we assign one by default.
        //     *---------------------------------------------------------------
        if (this.m_nFileOffset == 0)
            this.m_nBlockType = SupportedBlockTypes.TABMAP_HEADER_BLOCK;
        else {
            // Block type will be validated only if GetBlockType() is called
            // Тип блока будут проверяться только в том случае GetBlockType () вызывается
            this.Position = 0;
            this.m_nBlockType = this.ReadBuf(1)[0] as SupportedBlockTypes;
        }

        return true;
    }

    //*********************************************************************
    // *                   TABCreateMAPBlockFromFile()
    // *
    // * Load data from the specified file location and create and initialize 
    // * a TABMAP*Block of the right type to handle it.
    // *
    // * Returns the new object if succesful or NULL if an error happened, in 
    // * which case CPLError() will have been called.
    // *********************************************************************
    //        private TABRawBinBlock TABCreateMAPBlockFromFile(ref FILE fpSrc, int nOffset, int nSize, GBool bHardBlockSize, TABAccess eAccessMode)
    //{
    //    TABRawBinBlock poBlock = null;
    //    GByte pabyBuf;

    //    if (fpSrc == null || nSize == 0)
    //    {
    //        CPLError(CE_Failure, CPLE_AssertionFailed, "TABCreateMAPBlockFromFile(): Assertion Failed!");
    //        return null;
    //    }

    ////    ----------------------------------------------------------------
    ////     * Alloc a buffer to contain the data
    ////     *---------------------------------------------------------------
    //    pabyBuf = (GByte)CPLMalloc(nSize *sizeof(GByte));

    ////    ----------------------------------------------------------------
    ////     * Read from the file
    ////     *---------------------------------------------------------------
    //    if (VSIFSeek(fpSrc, nOffset, SEEK_SET) != 0 || VSIFRead(pabyBuf, sizeof(GByte), nSize, fpSrc)!=(uint)nSize)
    //    {
    //        CPLError(CE_Failure, CPLE_FileIO, "TABCreateMAPBlockFromFile() failed reading %d bytes at offset %d.", nSize, nOffset);
    //        CPLFree(pabyBuf);
    //        return null;
    //    }

    ////    ----------------------------------------------------------------
    ////     * Create an object of the right type
    ////     * Header block is different: it does not start with the object 
    ////     * type byte but it is always the first block in a file
    ////     *---------------------------------------------------------------
    //    if (nOffset == 0)
    //    {
    //        poBlock = new TABMAPHeaderBlock;
    //    }
    //    else
    //    {
    //        switch(pabyBuf[0])
    //        {
    //          case TABMAP_INDEX_BLOCK:
    //            poBlock = new TABMAPIndexBlock(eAccessMode);
    //            break;
    //          case TABMAP_OBJECT_BLOCK:
    //            poBlock = new TABMAPObjectBlock(eAccessMode);
    //            break;
    //          case TABMAP_COORD_BLOCK:
    //            poBlock = new TABMAPCoordBlock(eAccessMode);
    //            break;
    //          case TABMAP_TOOL_BLOCK:
    //            poBlock = new TABMAPToolBlock(eAccessMode);
    //            break;
    //          case TABMAP_GARB_BLOCK:
    //          default:
    //            poBlock = new TABRawBinBlock(eAccessMode, bHardBlockSize);
    //            break;
    //        }
    //    }

    ////    ----------------------------------------------------------------
    ////     * Init new object with the data we just read
    ////     *---------------------------------------------------------------
    //    if (poBlock.InitBlockFromData(pabyBuf, nSize, nSize, 0, fpSrc, nOffset) != 0)
    //    {
    //        // Some error happened... and CPLError() has been called
    //        poBlock = null;
    //        poBlock = null;
    //    }

    //    return poBlock;
    //}

    public GetBlockClass(): SupportedBlockTypes {
        // Extract block type... header block (first block in a file) has no block type, so we assign one by default.
        // Экстракт блок типа ... Блок заголовка (первый блок в файле) не имеет тип блока, так что мы назначить его по умолчанию.
        if (this.m_fp == null)
            return SupportedBlockTypes.TAB_RAWBIN_BLOCK;
        else {
            // Block type will be validated only if GetBlockType() is called
            // Тип блока будут проверяться только в том случае GetBlockType () вызывается
            //Position = 0;
            return this.ReadBuf(1)[0] as SupportedBlockTypes;
        }

    }

    private read = new DataView(new ArrayBuffer(8));

    ReadBuf(count: int): Uint8Array {
        this.m_fp.Read(new Uint8Array(this.read.buffer), 0, count);
        return new Uint8Array(this.read.buffer);
    }
    ReadByte() {
        this.m_fp.Read(new Uint8Array(this.read.buffer), 0, 1);
        return this.read.getUint8(0);
    }

    ReadShort() {
        this.m_fp.Read(new Uint8Array(this.read.buffer), 0, 2);
        return this.read.getInt16(0)
    }
    ReadInt() {
        this.m_fp.Read(new Uint8Array(this.read.buffer), 0, 4);
        return this.read.getInt32(0)
    }
    ReadLong() {
        this.m_fp.Read(new Uint8Array(this.read.buffer), 0, 8);
        return this.read.getBigInt64(0)
    }
    ReadDouble() {
        this.m_fp.Read(new Uint8Array(this.read.buffer), 0, 8);
        return this.read.getFloat64(0)
    }

    /*TODO ReadVars(m_fp: Stream, variable: any): void {

        let read: Uint8Array = new Uint8Array(8);

        if (variable instanceof Number) {
            m_fp.Read(read, 0, 1);
            variable = read[0];
        }
        else if (variable instanceof Number) {
            m_fp.Read(read, 0, 2);
            variable = BitConverter.ToInt16(read, 0);
        }
        else if (variable instanceof Number) {
            m_fp.Read(read, 0, 4);
            variable = BitConverter.ToInt32(read, 0);
        }
        else if (variable instanceof Number) {
            m_fp.Read(read, 0, 8);
            variable = BitConverter.ToInt64(read, 0);
        }
        else if (variable instanceof Number) {
            m_fp.Read(read, 0, 8);
            variable = BitConverter.ToDouble(read, 0);
            //};
        }
    }*/
}

/// <summary>
/// Режим доступа: чтение или запись,
/// </summary>
enum TABAccess {
    TABRead,
    TABWrite,
    TABReadWrite // ReadWrite not implemented yet 
}

/// <summary>
/// структура, что используется для хранения параметров проекции из заголовка .MAP
/// </summary>

class TABProjInfo {
    public nProjId: byte = 0; // See MapInfo Ref. Manual, App. F and G
    public nEllipsoidId: byte = 0;
    public nUnitsId: byte = 0;
    /// <summary>
    /// params in same order as in .MIF COORDSYS
    /// </summary>
    public adProjParams: double[] = [0, 0, 0, 0, 0, 0];
    /// <summary>
    /// Datum Id added in MapInfo 7.8+ (.map V500)
    /// </summary>
    public nDatumId: short = 0;
    /// <summary>
    /// Before that, we had to always lookup datum parameters to establish datum id
    /// </summary>
    public dDatumShiftX: double = 0;
    public dDatumShiftY: double = 0;
    public dDatumShiftZ: double = 0;
    public adDatumParams: double[] = [0, 0, 0, 0, 0];

    /// <summary>
    /// Affine parameters only in .map version 500 and up
    /// <remarks>false=No affine param, true=Affine params</remarks>
    /// </summary>
    public nAffineFlag: bool = false;
    public nAffineUnits: byte = 0;
    /// <summary>
    /// Affine params A-F
    /// </summary>
    public dAffineParam: double[] = [0, 0, 0, 0, 0, 0];
}

export class TABRawBlock {
    static Size = 0x200 as const;
    read = new DataView(new ArrayBuffer(TABRawBlock.Size)); // = new byte[Size];
    raws: DataView[] = [];
    public Position: short = 0;
    //public SupportedBlockTypes BlockClass = SupportedBlockTypes.TAB_RAWBIN_BLOCK;

    public static GetBlock(stream: Stream): Uint8Array {
        let block: Uint8Array = new Uint8Array(TABRawBlock.Size);
        stream.Read(block, 0, TABRawBlock.Size);
        return block;
    }

    public static GetBlockClass(block: Uint8Array): SupportedBlockTypes {
        if (block != null) {
            return block[0] as SupportedBlockTypes;
        } else {
            return SupportedBlockTypes.TAB_RAWBIN_BLOCK;
        }
    }

    /// <summary>
    /// Читаем блок
    /// </summary>
    /// <param name="stream"></param>
    constructor(block: ArrayBuffer) {
        this.Add(block);
    }

    public Add(block: ArrayBuffer): void {
        this.read = new DataView(block);
        this.raws.push(this.read);
    }

    //public TABRawBlock(TABRawBlock blk)
    //{
    //    read = blk.read;
    //    Position = blk.Position;
    //    //BlockClass = blk.BlockClass;
    //}

    Read(count: short) {
        let variable = new Uint8Array(count);
        //read.CopyTo(variable, Position);
        variable.set(new Uint8Array(this.read.buffer.slice(this.Position, this.Position + count)))
        //Array.Copy(this.read, this.Position, variable, 0, count);
        this.Position += count;
        return variable;
    }
    ReadByte() {
        let variable = this.read.getUint8(this.Position)
        this.Position += 1;
        return variable;
    }
    ReadSByte() {
        let variable = this.read.getInt8(this.Position)
        this.Position += 1;
        return variable;
    }

    ReadInt16() {
        let variable = this.read.getInt16(this.Position)
        this.Position += 2;
        return variable;
    }

    ReadInt32() {
        let variable = this.read.getInt32(this.Position)
        this.Position += 4;
        return variable;
    }
    ReadInt64() {
        let variable = this.read.getBigInt64(this.Position)
        this.Position += 8;
        return variable;
    }
    ReadDouble() {
        let variable = this.read.getFloat64(this.Position)
        this.Position += 8;
        return variable;
    }

}

/// <summary>
/// Supported .MAP block types (the first byte at the beginning of a block)
/// Поддерживаемые типы блоков .MAP (первый байт в начале блока)
/// </summary>
export enum SupportedBlockTypes {
    /// <summary>
    /// TAB_RAWBIN_BLOCK = -1
    /// </summary>
    TAB_RAWBIN_BLOCK = -1,
    /// <summary>
    /// TABMAP_HEADER_BLOCK = 0
    /// </summary>
    TABMAP_HEADER_BLOCK = 0,
    TABMAP_INDEX_BLOCK = 1,
    TABMAP_OBJECT_BLOCK = 2,
    TABMAP_COORD_BLOCK = 3,
    TABMAP_GARB_BLOCK = 4,
    TABMAP_TOOL_BLOCK = 5,
    TABMAP_LAST_VALID_BLOCK_TYPE = 5
}

/// <summary>
/// Общая информация о системной таблице и внутренней структуры координат
/// </summary>

export class TABMAPHeaderBlock extends TABRawBlock {
    // Set various constants used in generating the header block.
    // Установите различные константы, используемые в создании блока заголовка.
    public HDR_MAGIC_COOKIE: 42424242 = 42424242;
    static HDR_VERSION_NUMBER: 500 = 500;
    //public const int HDR_DATA_BLOCK_SIZE = 512;
    public HDR_DEF_ORG_QUADRANT: 1 = 1;   // N-E Quadrant
    public HDR_DEF_REFLECTXAXIS: 0 = 0;
    public HDR_OBJ_LEN_ARRAY_SIZE: 73 = 73;
    // The header block starts with an array of map object length constants.
    // Блок заголовка начинается с массива констант длины объекта карты.
    static gabyObjLenArray: number[] = [
        0x00, 0x0a, 0x0e, 0x15, 0x0e, 0x16, 0x1b, 0xa2,
        0xa6, 0xab, 0x1a, 0x2a, 0x2f, 0xa5, 0xa9, 0xb5,
        0xa7, 0xb5, 0xd9, 0x0f, 0x17, 0x23, 0x13, 0x1f,
        0x2b, 0x0f, 0x17, 0x23, 0x4f, 0x57, 0x63, 0x9c,
        0xa4, 0xa9, 0xa0, 0xa8, 0xad, 0xa4, 0xa8, 0xad,
        0x16, 0x1a, 0x39, 0x0d, 0x11, 0x37, 0xa5, 0xa9,
        0xb5, 0xa4, 0xa8, 0xad, 0xb2, 0xb6, 0xdc, 0xbd,
        0xbd, 0xf4, 0x2b, 0x2f, 0x55, 0xc8, 0xcc, 0xd8,
        0xc7, 0xcb, 0xd0, 0xd3, 0xd7, 0xfd, 0xc2, 0xc2,
        0xf9];

    //0x0	1	1	Header Block identifier (Value: 0x0) [!]
    public identifier: byte = 0;
    //0x1	1	1	Header Block header
    public header: byte = 0;
    //:
    //:Unknown (For length of header data offset see 0x163)
    //:
    //0x33/0x2D/0x27/0x1F
    //:
    //: (Value 0x0 [!])
    //: 0xFF
    public Unknown: Uint8Array = new Uint8Array(253);
    //0x100	4	1	Magic Number (0x28757B2 i.e.42424242) [?]
    MagicNumber: int;

    //    Установите допустимые значения по умолчанию для переменных.

    /// <summary>
    /// 0x104	2	1	Map File Version (not equal to table version)
    /// </summary>
    m_nMAPVersionNumber = TABMAPHeaderBlock.HDR_VERSION_NUMBER as number;
    /// <summary>
    /// 0x106	2	1	Unknown value: 0x200 [!], BlockSize[??]
    /// </summary>
    m_nBlockSize = TABRawBlock.Size as number;

    /// <summary>
    /// 0x108	8	1	CoordSysToDistUnits: Miles/LatDegree for Lat/Long maps 1.0  for all others [!]
    /// </summary>
    m_dCoordsys2DistUnits: double = 1.0;
    /// <summary>
    /// 0x110	4	4	Coordinates of Minimum Bounding Rectangle (MBR)
    /// </summary>
    m_nXMin = -1000000000;
    m_nYMin = -1000000000;
    m_nXMax = 1000000000;
    m_nYMax = 1000000000;
    //m_bIntBoundsOverflow = FALSE;

    /// 0x120	4	4	Coordinates of Default View of table

    /// <summary>
    /// 0x130	4	1	Offset of Object Definition Index (see also 0x15F)
    /// </summary>
    m_nFirstIndexBlock = 0;
    /// <summary>
    /// 0x134	4	1	Offset of the beginning of Deleted Block sequence
    /// </summary>
    m_nFirstGarbageBlock = 0;
    /// <summary>
    /// 0x138	4	1	Offset of Resources Block
    /// </summary>
    m_nFirstToolBlock = 0;
    /// <summary>
    /// 0x13C	4	1	Number of Symbol elements
    /// </summary>
    m_numPointObjects = 0;
    /// <summary>
    /// 0x140	4	1	Number of Line elements
    /// </summary>
    m_numLineObjects = 0;
    /// <summary>
    /// 0x144	4	1	Number of Region elements
    /// </summary>
    m_numRegionObjects = 0;
    /// <summary>
    /// 0x148	4	1	Number of Text elements
    /// </summary>
    m_numTextObjects = 0;
    /// <summary>
    /// 0x14C	4	1	MaxCoordBufSize
    /// </summary>
    m_nMaxCoordBufSize = 0;

    /// 0x14E	14	1	14 Unknown bytes (Probably reserved and set to zero)

    //        For detailed information on distance unit values see:
    //        MapInfoProgramDirectory/Ut/Reproject/MapInfoUnits.db
    /// <summary>
    /// 0x15E Map File Distance Units
    /// </summary>
    m_nDistUnitsCode = 7;       // Meters

    /// <summary>
    /// 0x15F	1	1	Type of Element Indexing data (see also 0x130)
    /// 0 = NoData
    /// 1 = Object Definition Block (NoIndex block)
    /// 2 = Index Block
    /// </summary>
    m_nMaxSpIndexDepth = 0;
    /// <summary>
    /// 0x160	1	1	CoordPrecision
    /// Value:6 for Lat/Long maps
    /// Value:8 for Cartesian maps
    /// Value:1 for Projected maps
    /// </summary>
    m_nCoordPrecision = 3;      // ??? 3 Digits of precision
    /// <summary>
    /// 0x161	1	1	CoordOriginCode
    /// Value:2 for Lat/Long maps
    /// Value:1 for Cartesian and Projected maps
    /// </summary>
    m_nCoordOriginQuadrant = this.HDR_DEF_ORG_QUADRANT as number; // ???
    /// <summary>
    /// 0x162	1	1	ReflectAxisCode	
    /// Value:1 for Lat/Long maps
    /// Value:0 for Cartesian and Projected maps
    /// </summary>
    m_nReflectXAxisCoord = this.HDR_DEF_REFLECTXAXIS as number;
    /// <summary>
    /// 0x163	1	1	ObjLenArraySize	(at start of this block)
    /// </summary>
    m_nMaxObjLenArrayId = this.HDR_OBJ_LEN_ARRAY_SIZE - 1;  // See gabyObjLenArray[]
    /// <summary>
    /// 0x164	1	1	Number of pen resources
    /// </summary>
    m_numPenDefs = 0;
    /// <summary>
    /// 0x165	1	1	Number of brush resources
    /// </summary>
    m_numBrushDefs = 0;
    /// <summary>
    /// 0x166	1	1	Number of symbol resources
    /// </summary>
    m_numSymbolDefs = 0;
    /// <summary>
    /// 0x167	1	1	Number of text resources
    /// </summary>
    m_numFontDefs = 0;
    /// <summary>
    /// 0x168	2	1	Number of Resource Blocks
    /// </summary>
    m_numMapToolBlocks = 0;

    //0x16D	1	1	Projection type
    //0x16E	1	1	Datum (See also &H1C0, &H1C8, &H1D0)
    //&H16F	1	1	Units of coordinate system (Values equal to &H15E)
    m_sProj: TABProjInfo = { nProjId: 0, nEllipsoidId: 0, nUnitsId: 0, adDatumParams: [], dAffineParam: [], dDatumShiftX: 0, dDatumShiftY: 0, dDatumShiftZ: 0, nAffineUnits: 0, nAffineFlag: false, nDatumId: 0, adProjParams: [] }


    m_XScale = 1000.0;  // Default coord range (before SetCoordSysBounds()) 
    m_YScale = 1000.0;  // will be [-1000000.000 .. 1000000.000]
    m_XDispl = 0.0;
    m_YDispl = 0.0;



    /// <summary>
    /// Конструктор
    /// </summary>
    /// <param name="stream"></param>
    constructor(block: ArrayBuffer) {
        super(block);

        this.Position = 0x100;
        this.MagicNumber = this.ReadInt32();

        if (this.MagicNumber != this.HDR_MAGIC_COOKIE) {
            throw new Error(`Неверный Magic Cookie: есть ${this.MagicNumber} /n ожидалось ${this.HDR_MAGIC_COOKIE}`);
        }
        //  Переменные-члены инициализации
        //  Вместо того, чтобы в течение 30 Get / Set методы, мы сделаем все члены данных общественности и мы будем инициализировать их здесь.
        //  По этой причине, этот класс следует использовать с осторожностью.
        this.m_nMAPVersionNumber = this.ReadInt16();
        this.m_nBlockSize = this.ReadInt16();
        this.m_dCoordsys2DistUnits = this.ReadDouble();

        this.m_nXMin = this.ReadInt32();
        this.m_nYMin = this.ReadInt32();
        this.m_nXMax = this.ReadInt32();
        this.m_nYMax = this.ReadInt32();

        this.Position = 0x130;     // Skip 16 unknown bytes 

        this.m_nFirstIndexBlock = this.ReadInt32();
        this.m_nFirstGarbageBlock = this.ReadInt32();
        this.m_nFirstToolBlock = this.ReadInt32();

        this.m_numPointObjects = this.ReadInt32();
        this.m_numLineObjects = this.ReadInt32();
        this.m_numRegionObjects = this.ReadInt32();
        this.m_numTextObjects = this.ReadInt32();
        this.m_nMaxCoordBufSize = this.ReadInt32();

        this.Position = 0x15e;     // Skip 14 unknown bytes

        this.m_nDistUnitsCode = this.ReadByte();
        this.m_nMaxSpIndexDepth = this.ReadByte();
        this.m_nCoordPrecision = this.ReadByte();
        this.m_nCoordOriginQuadrant = this.ReadByte();
        this.m_nReflectXAxisCoord = this.ReadByte();
        this.m_nMaxObjLenArrayId = this.ReadByte();  // See gabyObjLenArray[]
        this.m_numPenDefs = this.ReadByte();
        this.m_numBrushDefs = this.ReadByte();
        this.m_numSymbolDefs = this.ReadByte();
        this.m_numFontDefs = this.ReadByte();
        this.m_numMapToolBlocks = this.ReadInt16();

        // DatumId никогда не был установлен (всегда 0), пока MapInfo 7.8. См ошибку 910 
        // MAP Номер версии составляет 500 в этом случае.
        this.m_sProj.nDatumId = this.ReadInt16();
        if (this.m_nMAPVersionNumber < TABMAPHeaderBlock.HDR_VERSION_NUMBER) this.m_sProj.nDatumId = 0;

        ++this.Position;   // Skip unknown byte

        //&H16D	1	1	Projection type
        this.m_sProj.nProjId = this.ReadByte();
        //&H16E	1	1	Datum (See also &H1C0, &H1C8, &H1D0)
        this.m_sProj.nEllipsoidId = this.ReadByte();
        //&H16F	1	1	Units of coordinate system (Values equal to &H15E)
        this.m_sProj.nUnitsId = this.ReadByte();

        this.m_XScale = this.ReadDouble();
        this.m_YScale = this.ReadDouble();
        this.m_XDispl = this.ReadDouble();
        this.m_YDispl = this.ReadDouble();

        //     In V.100 files, the scale and displacement do not appear to be set.
        //     we'll use m_nCoordPrecision to define the scale factor instead.
        //     
        if (this.m_nMAPVersionNumber <= 100) {
            this.m_XScale = this.m_YScale = Math.pow(10.0, this.m_nCoordPrecision);
            this.m_XDispl = this.m_YDispl = 0.0;
        }

        for (let i = 0; i < 6; i++) {
            this.m_sProj.adProjParams[i] = this.ReadDouble();
        }

        this.m_sProj.dDatumShiftX = this.ReadDouble();
        this.m_sProj.dDatumShiftY = this.ReadDouble();
        this.m_sProj.dDatumShiftZ = this.ReadDouble();


        //         In V.200 files, the next 5 datum params are unused and they
        //         * sometimes contain junk bytes... in this case we set adDatumParams[]
        //         * to 0 for the rest of the lib to be happy.
        for (let i = 0; i < 5; i++) {
            this.m_sProj.adDatumParams[i] = this.ReadDouble();
            if (this.m_nMAPVersionNumber <= 200)
                this.m_sProj.adDatumParams[i] = 0.0;
        }

    }

    Addb(block: ArrayBuffer): void {
        this.Add(block);
        this.Position = 0;
        //Array.Resize(ref read, TABRawBlock.Size * 2);
        //Array.Copy(block.read, 0, read, TABRawBlock.Size, TABRawBlock.Size);
        this.m_sProj.nAffineFlag = false;
        //if (m_nMAPVersionNumber >= 500 && m_nSizeUsed > 512)
        //{
        // Read Affine parameters A,B,C,D,E,F 
        // only if version 500+ and block is larger than 512 bytes
        let nInUse = this.ReadByte();
        if (nInUse != 0) {
            this.m_sProj.nAffineFlag = true;
            this.m_sProj.nAffineUnits = this.ReadByte();
            this.Position += 6;
            //0x0208; // Skip unused bytes
            for (let i = 0; i < 6; i++) {
                this.m_sProj.dAffineParam[i] = this.ReadDouble();
            }
        }
        //}

    }

};

export class TABMAPIndexBlock extends TABRawBlock {
    constructor(block: ArrayBuffer)
    //: base(block)
    {
        super(block)//WARNING Возможно тут надо убрать
        this.Addb(block);
    }

    Addb(block: ArrayBuffer): void {
        this.Add(block);
        this.Position = 1;
        if (this.link == null)
            this.link = [0];
        else {
            this.link.push(0);
        }
        this.link[this.link.length - 1] = this.ReadByte();
        this.m_numEntries = this.ReadInt16();
        //m_asEntries = new TABMAPIndexEntry[m_numEntries];
        for (let i = 0; i < this.m_numEntries; i++) {
            let tmp: TABMAPIndexEntry = { TAB_MAX_ENTRIES_INDEX_BLOCK: 25, XMin: 0, YMin: 0, XMax: 0, YMax: 0, Id: 0 };
            tmp.XMin = this.ReadInt32();
            tmp.YMin = this.ReadInt32();
            tmp.XMax = this.ReadInt32();
            tmp.YMax = this.ReadInt32();
            tmp.Id = this.ReadInt32();
            this.m_asEntries.push(tmp);
        }

    }

    //Index Block header (length: &H4)
    //---------------------------------------------------------------
    //&H0	1	1	Index Block identifier (Value: &H1) [!]
    //&H1	1	1	Link
    public link: byte[] | null = null; //= new byte[0];
    //&H2	1	2	Number of Index data blocks
    public m_numEntries: short = 0;

    //Index data (length: &H14)
    //---------------------------------------------------------------
    //&H0	4	4	Object Definition Block MBR (XMin, YMin, XMax, YMax)
    //&H10	4	1	Object Definition Block offset
    public m_asEntries: TABMAPIndexEntry[] = [];// = new TABMAPIndexEntry[TABMAPIndexEntry.TAB_MAX_ENTRIES_INDEX_BLOCK];

    // Use these to keep track of current block's MBR
    m_nMinX = 1000000000;
    m_nMinY = 1000000000;
    m_nMaxX = -1000000000;
    m_nMaxY = -1000000000;

    //protected TABBinBlockManager m_poBlockManagerRef;

    // Info about child currently loaded
    protected m_poCurChild?: TABMAPIndexBlock;
    protected m_nCurChildIndex: number = 0;
    // Also need to know about its parent
    protected m_poParentRef?: TABMAPIndexBlock;

    //int GetNumFreeEntries();
    public GetNumEntries(): number {
        return this.m_numEntries;
    }
    //TABMAPIndexEntry GetEntry(int iIndex);

    //int AddEntry(TABMAPIndexEntry entry, bool bAddInThisNodeOnly);
    //int GetCurMaxDepth();
    //void GetMBR(ref int nXMin, ref int nYMin, ref int nXMax, ref int nYMax);
    //public int GetNodeBlockPtr()
    //{
    //    //return GetStartAddress();
    //}

    //C++ TO C# CONVERTER TODO TASK: The implementation of the following method could not be found:
    //    void SetMAPBlockManagerRef(ref TABBinBlockManager poBlockMgr);
    //C++ TO C# CONVERTER TODO TASK: The implementation of the following method could not be found:
    //    void SetParentRef(TABMAPIndexBlock poParent);
    //C++ TO C# CONVERTER TODO TASK: The implementation of the following method could not be found:
    //    void SetCurChildRef(TABMAPIndexBlock poChild, int nChildIndex);

    public GetCurChildIndex(): number {
        return this.m_nCurChildIndex;
    }
    public GetCurChild(): TABMAPIndexBlock {
        if (!this.m_poCurChild) {
            throw new Error('Unc error')
        }
        return this.m_poCurChild;
    }
    public GetParentRef(): TABMAPIndexBlock {
        if (!this.m_poParentRef) {
            throw new Error('Unc error')
        }
        return this.m_poParentRef;
    }

    //    int SplitNode(GInt32 nNewEntryXMin, GInt32 nNewEntryYMin, GInt32 nNewEntryXMax, GInt32 nNewEntryYMax);
    //    int SplitRootNode(GInt32 nNewEntryXMin, GInt32 nNewEntryYMin, GInt32 nNewEntryXMax, GInt32 nNewEntryYMax);
    //    void UpdateCurChildMBR(GInt32 nXMin, GInt32 nYMin, GInt32 nXMax, GInt32 nYMax, GInt32 nBlockPtr);
    //    void RecomputeMBR();
    //    int InsertEntry(GInt32 XMin, GInt32 YMin, GInt32 XMax, GInt32 YMax, GInt32 nBlockPtr);
    //    int ChooseSubEntryForInsert(GInt32 nXMin, GInt32 nYMin, GInt32 nXMax, GInt32 nYMax);
    //    GInt32 ChooseLeafForInsert(GInt32 nXMin, GInt32 nYMin, GInt32 nXMax, GInt32 nYMax);
    //    int UpdateLeafEntry(GInt32 nBlockPtr, GInt32 nXMin, GInt32 nYMin, GInt32 nXMax, GInt32 nYMax);
    //    int GetCurLeafEntryMBR(GInt32 nBlockPtr, ref GInt32 nXMin, ref GInt32 nYMin, ref GInt32 nXMax, ref GInt32 nYMax);

    // Static utility functions for node splitting, also used by the TABMAPObjectBlock class.
    //    static double ComputeAreaDiff(GInt32 nNodeXMin, GInt32 nNodeYMin, GInt32 nNodeXMax, GInt32 nNodeYMax, GInt32 nEntryXMin, GInt32 nEntryYMin, GInt32 nEntryXMax, GInt32 nEntryYMax);
    //    static int PickSeedsForSplit(ref TABMAPIndexEntry pasEntries, int numEntries, int nSrcCurChildIndex, GInt32 nNewEntryXMin, GInt32 nNewEntryYMin, GInt32 nNewEntryXMax, GInt32 nNewEntryYMax, ref int nSeed1, ref int nSeed2);

}

/// <summary>
/// Class to handle Read/Write operation on .MAP Object data Blocks (Type 02)
/// </summary>
export class TABMAPObjectBlock extends TABRawBlock {
    public constructor(block: ArrayBuffer)
    //: base(block)
    {
        super(block)//WARNING Возможно тут надо убрать
        this.Addb(block);
    }

    Addb(block: ArrayBuffer): void {
        this.Add(block);
        this.Position = 1;
        if (this.link == null)
            this.link = [0];
        else
            this.link.push(0);

        this.link[this.link.length - 1] = this.ReadByte();

        this.m_numDataBytes = this.ReadInt16();       /* Excluding 4 bytes header */

        this.m_nCenterX = this.ReadInt32();
        this.m_nCenterY = this.ReadInt32();

        this.m_nFirstCoordBlock = this.ReadInt32();
        this.m_nLastCoordBlock = this.ReadInt32();


        //m_nCurObjectOffset = -1;
        //m_nCurObjectId = -1;
        //m_nCurObjectType = -1;

        while (this.Position < this.m_numDataBytes + this.HeaderSize) {

            let poObj: MapFileRecord = new MapFileRecord();
            poObj.ShapeType = this.ReadByte();
            poObj.MBR.Id = this.ReadInt32();
            switch (poObj.ShapeType as GeometryType) {
                case (GeometryType.NONE):
                    //poObj = new TABMAPObjNone();
                    break;

                case (GeometryType.SYMBOL_C):
                    //ShortPoint [ID 1] (length: &HA):        [?]
                    //&H0     1       1       Identifier (Value: &H1) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     2       2       Coordinate value
                    //&H9     1       1       Symbol type number from Resource Block
                    //TABMAPObjPoint ShortPoint = new TABMAPObjPoint(poObj);
                    poObj.Points.push(
                        {
                            X: this.m_nCenterX + this.ReadInt16(),
                            Y: this.m_nCenterY + this.ReadInt16()
                        });
                    poObj.Symbol = this.ReadByte();
                    this.fetures.push(poObj);
                    break;
                case GeometryType.SYMBOL:
                    //LongPoint [ID 2] (length: &HE):
                    //&H0     1       1       Identifier (Value: &H2) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     4       2       Coordinate value
                    //&HD     1       1       Symbol type number from Resource Block
                    poObj.Points.push(
                        {
                            X: this.ReadInt32(),
                            Y: this.ReadInt32()
                        });
                    poObj.Symbol = this.ReadByte();
                    this.fetures.push(poObj);
                    break;
                //case GeometryType.FONTSYMBOL_C:
                //case GeometryType.FONTSYMBOL:
                //    poObj = new TABMAPObjFontPoint;
                //break;
                //  case GeometryType.CUSTOMSYMBOL_C:
                //  case GeometryType.CUSTOMSYMBOL:
                //    poObj = new TABMAPObjCustomPoint;
                //    break;
                case GeometryType.LINE_C:
                    //ShortLine [ID 4] (length: &HE):
                    //&H0     1       1       Identifier (Value: &H4) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     4       2       Coordinate value
                    //&HD     1       1       Line type number from Resource Block

                    poObj.Points.push({
                        X: this.m_nCenterX + this.ReadInt16(),
                        Y: this.m_nCenterY + this.ReadInt16()
                    });

                    poObj.Points.push({
                        X: this.m_nCenterX + this.ReadInt16(),
                        Y: this.m_nCenterY + this.ReadInt16()
                    });

                    poObj.Symbol = this.ReadByte();
                    this.fetures.push(poObj);
                    break;
                case GeometryType.LINE:
                    //LongLine [ID 5] (length: &H16):
                    //&H0     1       1       Identifier (Value: &H5) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     4       4       MBR
                    //&H15	1	1       Line type number from Resource Block
                    poObj.Points.push(
                        {
                            X: this.ReadInt32(),
                            Y: this.ReadInt32()
                        });
                    poObj.Points.push(
                        {
                            X: this.ReadInt32(),
                            Y: this.ReadInt32()
                        });
                    poObj.Symbol = this.ReadByte();
                    this.fetures.push(poObj);
                    break;
                case GeometryType.PLINE_C:
                    //ShortPolyline [ID 7] (length: &H1A):
                    //&H0     1       1       Identifier (Value: &H7) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     4       1       Offset of coordinate data in Coordinate Definition Block
                    //&H9     4       1       Bytes to read for coordinates from Coordinate Definition Block [?]
                    //&HD     2       2       Label location coordinates
                    //&H11    2       4       MBR     
                    //&H19    1       1       Line type number from Resource Block
                    poObj.CoordBlockPtr = this.ReadInt32();
                    poObj.CoordDataSize = this.ReadInt32();
                    poObj.LabelLocation = {
                        X: this.m_nCenterX + this.ReadInt16(),
                        Y: this.m_nCenterY + this.ReadInt16()
                    };
                    poObj.MBR.XMin = this.m_nCenterX + this.ReadInt16();
                    poObj.MBR.YMin = this.m_nCenterY + this.ReadInt16();
                    poObj.MBR.XMax = this.m_nCenterX + this.ReadInt16();
                    poObj.MBR.YMax = this.m_nCenterY + this.ReadInt16();
                    poObj.Symbol = this.ReadByte();
                    break;
                case GeometryType.PLINE:
                    //LongPolyline [ID 8] (length: &H26):
                    //&H0     1       1       Identifier (Value: &H8) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)
                    //&H5     4       1       Offset of coordinate data in Coordinate Definition Block
                    //&H9     4       1       Bytes to read for coordinates from Coordinate Definition Block [?]
                    //&HD     4       2       Label location coordinates
                    //&H15    4       4       MBR
                    //&H25    1       1       Line type number from Resource Block
                    poObj.CoordBlockPtr = this.ReadInt32();
                    poObj.CoordDataSize = this.ReadInt32();
                    poObj.LabelLocation = {
                        X: this.ReadInt32(),
                        Y: this.ReadInt32()
                    };
                    poObj.MBR.XMin = this.ReadInt32();
                    poObj.MBR.YMin = this.ReadInt32();
                    poObj.MBR.XMax = this.ReadInt32();
                    poObj.MBR.YMax = this.ReadInt32();
                    poObj.Symbol = this.ReadByte();

                    break;
                case GeometryType.REGION_C:
                    //ShortRegion [ID 13] (length: &H25):
                    //&H0     1       1       Identifier (Value: &HD) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     4       1       Offset of coordinate data in Coordinate Definition Block
                    //&H9     4       1       Bytes to read for coordinates from Coordinate Definition Block [??]
                    //&HD     2       1       Section count
                    //&HF     4       2       Label X,Y
                    //&H13    4       4       MBR
                    //&H23    1       1       Line type number from Resource Block
                    //&H24    1       1       Brush type number from Resource Block
                    break;
                case GeometryType.REGION:
                    //LongRegion [ID 14] (length: &H29):
                    //&H0     1       1       Identifier (Value: &HE) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     4       1       Offset of coordinate data in Coordinate Definition Block
                    //&H9     4       1       Bytes to read for coordinates from Coordinate Definition Block [??]
                    //&HD     2       1       Section count
                    //&HF     4       2       Label X,Y
                    //&H17	4       4       MBR
                    //&H27    1       1       Line type number from Resource Block
                    //&H28    1       1       Brush type number from Resource Block
                    break;
                //  case GeometryType.MULTIPLINE_C:
                //  case GeometryType.MULTIPLINE:
                //  case GeometryType.V450_REGION_C:
                //  case GeometryType.V450_REGION:
                //  case GeometryType.V450_MULTIPLINE_C:
                //  case GeometryType.V450_MULTIPLINE:
                //  case GeometryType.V800_REGION_C:
                //  case GeometryType.V800_REGION:
                //  case GeometryType.V800_MULTIPLINE_C:
                //  case GeometryType.V800_MULTIPLINE:
                //    poObj = new TABMAPObjPLine;
                //    break;
                case GeometryType.ARC_C:
                    //ShortArc [ID 10] (length: &H16):
                    //&H0     1       1       Identifier (Value: &HA) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     4       2       MBR of defining ellipse
                    //&HD     4       2       MBR of the arc
                    //&H15    1       1       Line type number from Resource Block
                    break;
                case GeometryType.ARC:
                    //LongArc [ID 11] (length: &H26):
                    //&H0     1       1       Identifier (Value: &HB) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     4       4       MBR of defining ellipse
                    //&15     4       4       MBR of the arc
                    //&H25    1       1       Line type number from Resource Block
                    break;
                //poObj = new TABMAPObjArc;
                //    break;
                case GeometryType.RECT_C:
                    //ShortRectangle [ID 19] (length: &HF):
                    //&H0     1       1       Identifier (Value: &H10) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     2       4       MBR
                    //&HD     1       1       Line type number in Resource Block
                    //&HE     1       1       Brush type number in Resource Block
                    break;
                case GeometryType.RECT:
                    //LongRectangle [ID 20] (length: &H17):
                    //&H0     1       1       Identifier (Value: &H17) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     4       4       MBR
                    //&H15    1       1       Line type number from Resource Block
                    //&H16    1       1       Brush type number from Resource Block
                    break;
                case GeometryType.ROUNDRECT_C:
                    //ShortRoundRectangle [ID 22] (length: &H13):
                    //&H0     1       1       Identifier (Value: &H16) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     2       1       XRadius
                    //&H7     2       1       YRadius
                    //&H9     2       4       MBR
                    //&H11    1       1       Line type number from Resource Block
                    //&H12    1       1       Brush type number from Resource Block
                    break;
                case GeometryType.ROUNDRECT:
                    //LongRoundRectangle [ID 23] (length: &H1F):
                    //&H0     1       1       Identifier (Value: &H16) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     4       1       XRadius
                    //&H9     4       1       YRadius
                    //&HD     4       4       MBR
                    //&H1D    1       1       Line type number from Resource Block
                    //&H1E    1       1       Brush type number from Resource Block
                    break;
                case GeometryType.ELLIPSE_C:
                    //ShortEllipse [ID 25] (length: &HF):
                    //&H0     1       1       Identifier (Value: &H1A) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     2       4       MBR
                    //&HD	1       1       Line type number from Resource Block
                    //&HE	1       1       Brush type number from Resource Block
                    break;
                case GeometryType.ELLIPSE:
                    //LongEllipse [ID 26] (length: &H17):
                    //&H0     1       1       Identifier (Value: &H1A) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     4       4       MBR
                    //&H15    1       1       Line type number from Resource Block
                    //&H16    1       1       Brush type number from Resource Block
                    break;
                //    poObj = new TABMAPObjRectEllipse;
                //    break;
                case GeometryType.TEXT_C:
                    //ShortText [ID 16] (length: &H27)
                    //&H0     1       1       Identifier (Value: &H10) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     4       1       Offset of text body in Coordinate Definition Block
                    //&H9     2       1       Number of characters in text body
                    //&HB     2       1       Justification spacing arrowtype:
                    //                                flag 2^1 - centered text 
                    //                                flag 2^2 - right aligned text 
                    //                                flag 2^3 - line spacing 1.5 
                    //                                flag 2^4 - line spacing 2.0 
                    //                                flag 2^5 - label line: simple 
                    //                                flag 2^6 - label line: arrow 
                    //&HD     2       1       Text rotation angle (0.1 degrees)
                    //&HF     1       1       FontStyle #1:
                    //                                flag 2^0 - bold text 
                    //                                flag 2^1 - italic text 
                    //                                flag 2^2 - underlined text 
                    //                                flag 2^3 - overlined text 
                    //                                flag 2^4 - unknown 
                    //                                flag 2^5 - shadowed text 
                    //&H10    1       1       FontStyle #2:
                    //                                flag 2^0 - box background 
                    //                                flag 2^1 - halo background 
                    //                                flag 2^2 - All Caps 
                    //                                flag 2^3 - Expanded
                    //&H11    3       1       Foreground color
                    //&H14    3       1       Background color
                    //&H17    2       2       Arrow endpoint coordinates
                    //&H1B    2       1	Height
                    //&H1D	1	1	Font name index
                    //&H1E    2       4       MBR
                    //&H26    1       1       Pen type from Resource Block
                    break;
                case GeometryType.TEXT:
                    //LongText [ID 17] (length: &H32)
                    //&H0     1       1       Identifier (Value: &H11) [!]
                    //&H1     4       1       RowID - Validity: (+0 = Valid; +&H40000000 = Deleted)       
                    //&H5     4       1       Offset of text body in Coordinate Definition Block
                    //&H9     2       1       Number of characters in text body
                    //&HC     2       1       Justification spacing arrowtype:
                    //                                flag 2^1 - centered text 
                    //                                flag 2^2 - right aligned text 
                    //                                flag 2^3 - line spacing 1.5 
                    //                                flag 2^4 - line spacing 2.0 
                    //                                flag 2^5 - label line: simple 
                    //                                flag 2^6 - label line: arrow 
                    //&HD     2       1       Text rotation angle (0.1 degrees)
                    //&HF     1       1       FontStyle #1:
                    //                                flag 2^0 - bold text 
                    //                                flag 2^1 - italic text 
                    //                                flag 2^2 - underlined text 
                    //                                flag 2^3 - overlined text 
                    //                                flag 2^4 - unknown 
                    //                                flag 2^5 - shadowed text 
                    //&H10    1       1       FontStyle #2:
                    //                                flag 2^0 - box background 
                    //                                flag 2^1 - halo background 
                    //                                flag 2^2 - All Caps 
                    //                                flag 2^3 - Expanded
                    //&H11    3       1       Foreground color
                    //&H14    3       1       Background color
                    //&H17    4       2       Arrow endpoint coordinates
                    //&H1F    1       4	Height
                    //&H20	1	1	Font name index
                    //&H30    4       4       MBR
                    //&H31    1       1       Pen type from Resource Block
                    break;
                //    poObj = new TABMAPObjText;
                //    break;
                //  case GeometryType.MULTIPOINT_C:
                //  case GeometryType.MULTIPOINT:
                //  case GeometryType.V800_MULTIPOINT_C:
                //  case GeometryType.V800_MULTIPOINT:
                //    poObj = new TABMAPObjMultiPoint;
                //    break;
                //  case GeometryType.COLLECTION_C:
                //  case GeometryType.COLLECTION:
                //  case GeometryType.V800_COLLECTION_C:
                //  case GeometryType.V800_COLLECTION:
                //    poObj = new TABMAPObjCollection();
                //break;
                default:
                    throw new Error('Unknown ShapeType type =' + poObj.ShapeType);
                //break;
            }
        }
    }


    //Object Definition Block header (length: &H14)
    HeaderSize = 20;
    //&H0     1       1	Object Definition Block identifier (Value: &H2) [!]
    //&H1     1       1	Link to next Object Definition Block
    link: number[] | null = null; // = new byte[0];
    //&H2     2       1	Bytes To Follow (length of ODB data)
    m_numDataBytes: short = 0; // Excluding first 4 bytes header 
    //&H4     4       4	Base coordinate values for short object types
    m_nCenterX: int = 0;
    m_nCenterY: int = 0;
    m_nFirstCoordBlock: int = 0;
    m_nLastCoordBlock: int = 0;

    public fetures: MapFileRecord[] = [];

    //Object Definition data items, which are identified by a code in the first byte, are
    //arrayed in an Object Definition Block after the header. The items in an Object
    //Definition Block reference coordinate and section definitions in  
    //an associated Coordinate Definition Block (or Blocks). For details about 
    //object types see Edwards' notes.

    //Объект элементы данных Определение, которые определены с помощью кода в первом байте, 
    //облеченные в определении объекта блока после заголовка. Элементы в объект ссылки 
    //определение блока координации и определения раздела в соответствующем координат 
    //определение блока (или блоков). Для получения подробной информации о типах объектов см заметки Эдвардса.

    // In order to compute block center, we need to keep track of MBR
    protected m_nMinX = 1000000000;
    protected m_nMinY = 1000000000;
    protected m_nMaxX = -1000000000;
    protected m_nMaxY = -1000000000;

    // Keep track of current object either in read or read/write mode
    protected m_nCurObjectOffset: number = 0; // -1 if there is no current object.
    protected m_nCurObjectId: number = 0; // -1 if there is no current object.
    protected m_nCurObjectType: number = 0; // -1 if there is no current object.

    //C++ TO C# CONVERTER TODO TASK: The implementation of the following method could not be found:
    //    virtual int ReadIntCoord(GBool bCompressed, ref GInt32 nX, ref GInt32 nY);
    //C++ TO C# CONVERTER TODO TASK: The implementation of the following method could not be found:
    //    int WriteIntCoord(GInt32 nX, GInt32 nY, GBool bCompressed);
    //C++ TO C# CONVERTER TODO TASK: The implementation of the following method could not be found:
    //    int WriteIntMBRCoord(GInt32 nXMin, GInt32 nYMin, GInt32 nXMax, GInt32 nYMax, GBool bCompressed);
    //C++ TO C# CONVERTER TODO TASK: The implementation of the following method could not be found:
    //    int UpdateMBR(GInt32 nX, GInt32 nY);

    //C++ TO C# CONVERTER TODO TASK: The implementation of the following method could not be found:
    //    int PrepareNewObject(ref TABMAPObjHdr poObjHdr);
    //C++ TO C# CONVERTER TODO TASK: The implementation of the following method could not be found:
    //    int CommitNewObject(ref TABMAPObjHdr poObjHdr);

    //C++ TO C# CONVERTER TODO TASK: The implementation of the following method could not be found:
    //    void AddCoordBlockRef(GInt32 nCoordBlockAddress);
    GetFirstCoordBlockAddress() {
        return this.m_nFirstCoordBlock;
    }
    GetLastCoordBlockAddress() {
        return this.m_nLastCoordBlock;
    }

    //C++ TO C# CONVERTER TODO TASK: The implementation of the following method could not be found:
    //    void GetMBR(ref GInt32 nXMin, ref GInt32 nYMin, ref GInt32 nXMax, ref GInt32 nYMax);
    //C++ TO C# CONVERTER TODO TASK: The implementation of the following method could not be found:
    //    void SetMBR(GInt32 nXMin, GInt32 nYMin, GInt32 nXMax, GInt32 nYMax);

    //C++ TO C# CONVERTER TODO TASK: The implementation of the following method could not be found:
    //    void Rewind();
    //C++ TO C# CONVERTER TODO TASK: The implementation of the following method could not be found:
    //    int AdvanceToNextObject(TABMAPHeaderBlock NamelessParameter);
    GetCurObjectOffset() {
        return this.m_nCurObjectOffset;
    }
    GetCurObjectId() {
        return this.m_nCurObjectId;
    }
    GetCurObjectType() {
        return this.m_nCurObjectType;
    }

}

/// <summary>
/// Entries found in type 1 blocks of .MAP files
/// We will use this struct to rebuild the geographic index in memory
/// Мы будем использовать эту структуру, чтобы восстановить географический индекс в памяти
/// </summary>
export type TABMAPIndexEntry =
    {
        TAB_MAX_ENTRIES_INDEX_BLOCK: short;
        // These members refer to the info we find in the file
        // Эти члены относятся к информации, которую находим в файле
        XMin: int;
        YMin: int;
        XMax: int;
        YMax: int;
        Id: int;
    }

export type TABVertex =
    {
        X: number;
        Y: number;
    }

export type TABMAPVertex = {
    X: number;
    Y: number;
}

class TABMAPObjHdr {
    public m_nType: byte = 0;
    public MBR: TABMAPIndexEntry; // Object MBR 

    constructor(obj: TABMAPObjHdr) {
        this.m_nType = obj.m_nType;
        this.MBR = obj.MBR;
    }

    //    static TABMAPObjHdr NewObj(GByte nNewObjType, GInt32 nId);
    //    static TABMAPObjHdr ReadNextObj(ref TABMAPObjectBlock poObjBlock, ref TABMAPHeaderBlock poHeader);

    /// <summary>
    /// Returns TRUE if the current object type uses compressed coordinates or FALSE otherwise.
    /// </summary>
    /// <returns></returns>
    private IsCompressedType(): bool {
        // Compressed types are 1, 4, 7, etc.
        return ((this.m_nType % 3) == 1 ? true : false);
    }
    //    int WriteObjTypeAndId(TABMAPObjectBlock NamelessParameter);
    //    void SetMBR(GInt32 nMinX, GInt32 nMinY, GInt32 nMaxX, GInt32 mMaxY);

    //public virtual int WriteObj(ref TABMAPObjectBlock UnnamedParameter1)
    //{
    //    return -1;
    //}

    //  protected:
    //public virtual int ReadObj(ref TABMAPObjectBlock UnnamedParameter1)
    //{
    //    return -1;
    //}
}

/// <summary>
/// Codes for the known MapInfo Geometry types
/// </summary>
enum GeometryType {
    NONE = 0,
    SYMBOL_C = 0x01,
    SYMBOL = 0x02,
    LINE_C = 0x04,
    LINE = 0x05,
    PLINE_C = 0x07,
    PLINE = 0x08,
    ARC_C = 0x0a,
    ARC = 0x0b,
    REGION_C = 0x0d,
    REGION = 0x0e,
    TEXT_C = 0x10,
    TEXT = 0x11,
    RECT_C = 0x13,
    RECT = 0x14,
    ROUNDRECT_C = 0x16,
    ROUNDRECT = 0x17,
    ELLIPSE_C = 0x19,
    ELLIPSE = 0x1a,
    MULTIPLINE_C = 0x25,
    MULTIPLINE = 0x26,
    FONTSYMBOL_C = 0x28,
    FONTSYMBOL = 0x29,
    CUSTOMSYMBOL_C = 0x2b,
    CUSTOMSYMBOL = 0x2c,
    //Version 450 object types:
    V450_REGION_C = 0x2e,
    V450_REGION = 0x2f,
    V450_MULTIPLINE_C = 0x31,
    V450_MULTIPLINE = 0x32,
    //Version 650 object types:
    MULTIPOINT_C = 0x34,
    MULTIPOINT = 0x35,
    COLLECTION_C = 0x37,
    COLLECTION = 0x38,
    //Version 800 object types:
    UNKNOWN1_C = 0x3a,
    UNKNOWN1 = 0x3b,
    V800_REGION_C = 0x3d,
    V800_REGION = 0x3e,
    V800_MULTIPLINE_C = 0x40,
    V800_MULTIPLINE = 0x41,
    V800_MULTIPOINT_C = 0x43,
    V800_MULTIPOINT = 0x44,
    V800_COLLECTION_C = 0x46,
    V800_COLLECTION = 0x47,
}

class TABMAPObjHdrWithCoord extends TABMAPObjHdr {
    m_nCoordBlockPtr: number = 0;
    m_nCoordDataSize: number = 0;

    //     Eventually this class may have methods to help maintaining refs to
    //     * coord. blocks when splitting object blocks.
    //     
}

class TABMAPObjNone extends TABMAPObjHdr {

    public TABMAPObjNone() {
    }

    //public virtual int WriteObj(ref TABMAPObjectBlock UnnamedParameter1)
    //{
    //    return 0;
    //}

    //  protected:
    //public virtual int ReadObj(ref TABMAPObjectBlock UnnamedParameter1)
    //{
    //    return 0;
    //}
}


class TABMAPObjPoint extends TABMAPObjHdr {
    public Position: TABMAPVertex = { X: 0, Y: 0 };
    public m_nSymbolId: byte = 0;

    constructor(obj: TABMAPObjHdr) {
        super(obj)
    }
    //    virtual int WriteObj(TABMAPObjectBlock NamelessParameter);

}